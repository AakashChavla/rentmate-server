import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { IsNull, type Repository } from 'typeorm';
import { TenantRepository } from '../../common/base/tenant.repository';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { durationToMs } from '../../common/utils/duration';
import { AppConfigService } from '../../config/app-config.service';
import { RefreshToken } from './refresh-token.entity';
import { hashesEqual, sha256 } from './token-hash';
import type {
  AccessTokenClaims,
  ClientMeta,
  IssuedSession,
  RefreshTokenClaims,
} from './token.types';

@Injectable()
export class TokenService {
  private readonly tokens: TenantRepository<RefreshToken>;

  constructor(
    @InjectRepository(RefreshToken) repository: Repository<RefreshToken>,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {
    this.tokens = new TenantRepository(repository);
  }

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

    await this.tokens.save(input.organizationId, {
      id: refreshId,
      userId: input.userId,
      familyId,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(now.getTime() + durationToMs(this.config.jwtRefreshTtl)),
      revokedAt: null,
      replacedById: null,
      userAgent: input.meta.userAgent,
      ip: input.meta.ip,
    });

    return { accessToken, refreshToken, familyId };
  }

  async rotate(refreshToken: string, meta: ClientMeta, now = new Date()): Promise<IssuedSession> {
    const claims = await this.readRefreshClaims(refreshToken);
    const current = await this.tokens.findOne(claims.org, { where: { id: claims.jti } });
    if (!current || !hashesEqual(current.tokenHash, sha256(refreshToken))) {
      throw unauthorized();
    }

    if (current.revokedAt) {
      await this.revokeFamily(claims.org, current.familyId, now);
      throw sessionRevoked();
    }

    if (current.expiresAt.getTime() <= now.getTime()) {
      throw tokenExpired();
    }

    const replacementId = randomUUID();
    const replaced = await this.tokens.update(
      claims.org,
      { id: current.id, revokedAt: IsNull() },
      { revokedAt: now, replacedById: replacementId },
    );
    if ((replaced.affected ?? 0) === 0) {
      await this.revokeFamily(claims.org, current.familyId, now);
      throw sessionRevoked();
    }

    const accessToken = await this.signAccess({
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

    await this.tokens.save(claims.org, {
      id: replacementId,
      userId: claims.sub,
      familyId: claims.fid,
      tokenHash: sha256(nextRefresh),
      expiresAt: new Date(now.getTime() + durationToMs(this.config.jwtRefreshTtl)),
      revokedAt: null,
      replacedById: null,
      userAgent: meta.userAgent,
      ip: meta.ip,
    });

    return { accessToken, refreshToken: nextRefresh, familyId: claims.fid };
  }

  async verifyAccess(token: string): Promise<AccessTokenClaims> {
    const payload = await this.verify(token, this.config.jwtAccessSecret);
    if (!isAccessClaims(payload)) {
      throw unauthorized();
    }

    return payload;
  }

  /** Checks a refresh cookie without rotating it. Used by logout and the auth guard. */
  async verifyRefresh(token: string, now = new Date()): Promise<RefreshTokenClaims> {
    const claims = await this.readRefreshClaims(token);
    const current = await this.tokens.findOne(claims.org, { where: { id: claims.jti } });
    if (!current || !hashesEqual(current.tokenHash, sha256(token))) {
      throw unauthorized();
    }

    if (current.revokedAt) {
      await this.revokeFamily(claims.org, current.familyId, now);
      throw sessionRevoked();
    }

    if (current.expiresAt.getTime() <= now.getTime()) {
      throw tokenExpired();
    }

    return claims;
  }

  revokeFamily(organizationId: string, familyId: string, revokedAt = new Date()): Promise<unknown> {
    return this.tokens.update(organizationId, { familyId, revokedAt: IsNull() }, { revokedAt });
  }

  revokeAllForUser(
    organizationId: string,
    userId: string,
    revokedAt = new Date(),
  ): Promise<unknown> {
    return this.tokens.update(organizationId, { userId, revokedAt: IsNull() }, { revokedAt });
  }

  async revokeOtherFamilies(
    organizationId: string,
    userId: string,
    keepFamilyId: string,
    revokedAt = new Date(),
  ): Promise<void> {
    const rows = await this.tokens.find(organizationId, { where: { userId } });
    await Promise.all(
      rows
        .filter((row) => !row.revokedAt && row.familyId !== keepFamilyId)
        .map((row) => this.tokens.update(organizationId, { id: row.id }, { revokedAt })),
    );
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
