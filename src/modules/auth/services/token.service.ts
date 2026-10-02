import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { ErrorCode } from '../../../core/errors/error-codes';
import { AppException } from '../../../core/errors/app.exception';
import { durationToMs } from '../../../shared/duration';
import { AppConfigService } from '../../../core/config/app-config.service';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { TransactionRunner } from '../../../core/database/transaction-runner';
import { hashesEqual, sha256 } from '../../../shared/hashing';
import { SessionRevoker } from '../contracts/session-revoker.contract';
import type {
  AccessTokenClaims,
  ClientMeta,
  IssuedSession,
  RefreshTokenClaims,
} from '../types/token.types';

@Injectable()
export class TokenService implements SessionRevoker {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly transactionRunner: TransactionRunner,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async issue(input: {
    userId: string;
    organizationId: string;
    familyId?: string;
    meta: ClientMeta;
    now?: Date;
  }): Promise<IssuedSession> {
    const now = input.now ?? new Date();
    const familyId = input.familyId ?? randomUUID();
    const refreshId = randomUUID();

    const accessToken = await this.signAccess({
      sub: input.userId,
      org: input.organizationId,
      fid: familyId,
    });

    const refreshToken = await this.signRefresh({
      sub: input.userId,
      org: input.organizationId,
      fid: familyId,
      jti: refreshId,
    });

    await this.refreshTokenRepository.saveToken({
      id: refreshId,
      userId: input.userId,
      organizationId: input.organizationId,
      familyId,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(now.getTime() + durationToMs(this.config.jwtRefreshTtl)),
      revokedAt: undefined,
      replacedById: undefined,
      userAgent: input.meta.userAgent,
      ip: input.meta.ip,
    });

    return { accessToken, refreshToken, familyId };
  }

  async rotate(refreshToken: string, meta: ClientMeta, now = new Date()): Promise<IssuedSession> {
    const claims = await this.readRefreshClaims(refreshToken);
    const current = await this.refreshTokenRepository.findByJti(claims.jti);

    if (!current || !hashesEqual(current.tokenHash, sha256(refreshToken))) {
      throw unauthorized();
    }

    if (current.revokedAt) {
      await this.revokeFamily(claims.org, current.familyId);
      throw sessionRevoked();
    }

    if (current.expiresAt.getTime() <= now.getTime()) {
      throw tokenExpired();
    }

    const replacementId = randomUUID();

    const result = await this.transactionRunner.run(async () => {
      current.revokedAt = now;
      current.replacedById = replacementId;
      await this.refreshTokenRepository.updateToken(current);

      const nextAccess = await this.signAccess({
        sub: claims.sub,
        org: claims.org,
        fid: claims.fid,
      });

      const nextRefresh = await this.signRefresh({
        sub: claims.sub,
        org: claims.org,
        fid: claims.fid,
        jti: replacementId,
      });

      await this.refreshTokenRepository.saveToken({
        id: replacementId,
        userId: claims.sub,
        organizationId: claims.org,
        familyId: claims.fid,
        tokenHash: sha256(nextRefresh),
        expiresAt: new Date(now.getTime() + durationToMs(this.config.jwtRefreshTtl)),
        revokedAt: undefined,
        replacedById: undefined,
        userAgent: meta.userAgent,
        ip: meta.ip,
      });

      return { accessToken: nextAccess, refreshToken: nextRefresh, familyId: claims.fid };
    });

    return result;
  }

  async verifyAccess(token: string): Promise<AccessTokenClaims> {
    const payload = await this.verify(token, this.config.jwtAccessSecret);
    if (!isAccessClaims(payload)) {
      throw unauthorized();
    }

    return payload;
  }

  async verifyRefresh(token: string, now = new Date()): Promise<RefreshTokenClaims> {
    const claims = await this.readRefreshClaims(token);
    const current = await this.refreshTokenRepository.findByJti(claims.jti);

    if (!current || !hashesEqual(current.tokenHash, sha256(token))) {
      throw unauthorized();
    }

    if (current.revokedAt) {
      await this.revokeFamily(claims.org, current.familyId);
      throw sessionRevoked();
    }

    if (current.expiresAt.getTime() <= now.getTime()) {
      throw tokenExpired();
    }

    return claims;
  }

  // SessionRevoker contract methods
  async revokeFamily(organizationId: string, familyId: string): Promise<void> {
    await this.refreshTokenRepository.revokeFamily(organizationId, familyId);
  }

  async revokeAllForUser(organizationId: string, userId: string): Promise<void> {
    await this.refreshTokenRepository.revokeAllForUser(organizationId, userId);
  }

  private async readRefreshClaims(token: string): Promise<RefreshTokenClaims> {
    const payload = await this.verify(token, this.config.jwtRefreshSecret);
    if (!isRefreshClaims(payload)) {
      throw unauthorized();
    }

    return payload;
  }

  private signAccess(claims: AccessTokenClaims): Promise<string> {
    return this.jwt.signAsync(claims, {
      secret: this.config.jwtAccessSecret,
      expiresIn: Math.floor(durationToMs(this.config.jwtAccessTtl) / 1000),
    });
  }

  private signRefresh(claims: RefreshTokenClaims): Promise<string> {
    return this.jwt.signAsync(claims, {
      secret: this.config.jwtRefreshSecret,
      expiresIn: Math.floor(durationToMs(this.config.jwtRefreshTtl) / 1000),
    });
  }

  private async verify(token: string, secret: string): Promise<unknown> {
    try {
      return await this.jwt.verifyAsync(token, { secret });
    } catch (error) {
      if (isExpiredJwt(error)) {
        throw tokenExpired();
      }

      throw unauthorized();
    }
  }
}

function unauthorized(): AppException {
  return new AppException(
    ErrorCode.UNAUTHORIZED,
    'Authentication required',
    HttpStatus.UNAUTHORIZED,
  );
}

function tokenExpired(): AppException {
  return new AppException(ErrorCode.TOKEN_EXPIRED, 'Token expired', HttpStatus.UNAUTHORIZED);
}

function sessionRevoked(): AppException {
  return new AppException(ErrorCode.SESSION_REVOKED, 'Session revoked', HttpStatus.UNAUTHORIZED);
}

function isExpiredJwt(error: unknown): boolean {
  return error instanceof Error && error.name === 'TokenExpiredError';
}

function isAccessClaims(value: unknown): value is AccessTokenClaims {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const claims = value as Partial<AccessTokenClaims>;
  return Boolean(claims.sub && claims.org && claims.fid);
}

function isRefreshClaims(value: unknown): value is RefreshTokenClaims {
  if (!isAccessClaims(value)) {
    return false;
  }

  return Boolean((value as Partial<RefreshTokenClaims>).jti);
}
