import { HttpStatus, Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../core/errors/error-codes';
import { AppException } from '../../../core/errors/app.exception';
import {
  PermissionService,
  type AuthProfile,
} from '../../authorization/services/permission.service';
import { UserRepository } from '../../users/repositories/user.repository';
import { User, UserStatus } from '../../users/entities/user.entity';
import { OtpPurpose } from '../entities/otp-verification.entity';
import { OtpService } from './otp.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { TransactionRunner } from '../../../core/database/transaction-runner';
import type { ClientMeta, IssuedSession } from '../types/token.types';

const LOGIN_LOCK_MS = 15 * 60 * 1000;
const MAX_LOGIN_FAILURES = 5;

export type MeResponse = Omit<AuthProfile, 'grants'>;

export interface AuthenticatedSession {
  profile: MeResponse;
  tokens: IssuedSession;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly otp: OtpService,
    private readonly permissions: PermissionService,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  async login(email: string, password: string, meta: ClientMeta): Promise<AuthenticatedSession> {
    const user = await this.userRepository.findByEmailForAuth(email);
    const now = new Date();
    if (user?.lockedUntil && user.lockedUntil.getTime() > now.getTime()) {
      throw accountLocked(user.lockedUntil, now);
    }

    const passwordOk = await this.passwords.verify(user?.passwordHash ?? null, password);
    if (!user || !passwordOk) {
      if (user) {
        await this.recordFailure(user, now);
      }

      throw invalidCredentials();
    }

    if (user.status === UserStatus.Suspended) {
      throw accountSuspended();
    }

    await this.userRepository.saveUser({
      ...user,
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: now,
      organizationId: user.organizationId,
    });
    return this.startSession(user.id, user.organizationId, meta);
  }

  async refresh(refreshToken: string, meta: ClientMeta): Promise<AuthenticatedSession> {
    const tokens = await this.tokens.rotate(refreshToken, meta);
    const claims = await this.tokens.verifyAccess(tokens.accessToken);
    const profile = await this.requireProfile(claims.sub, claims.org);
    return { profile: toMe(profile), tokens };
  }

  async logout(accessToken?: string, refreshToken?: string): Promise<void> {
    if (accessToken) {
      try {
        const claims = await this.tokens.verifyAccess(accessToken);
        await this.tokens.revokeFamily(claims.org, claims.fid);
        return;
      } catch (error) {
        if (!isExpired(error)) {
          throw error;
        }
      }
    }

    if (!refreshToken) {
      throw unauthorized();
    }

    const claims = await this.tokens.verifyRefresh(refreshToken);
    await this.tokens.revokeFamily(claims.org, claims.fid);
  }

  sendOtp(email: string, purpose: OtpPurpose): Promise<{ accepted: true }> {
    return this.otp.send(email, purpose);
  }

  async verifyOtp(
    email: string,
    code: string,
    purpose: OtpPurpose,
    meta: ClientMeta,
  ): Promise<AuthenticatedSession> {
    const user = await this.otp.verify(email, code, purpose);
    if (user.status === UserStatus.Suspended) {
      throw accountSuspended();
    }

    await this.userRepository.saveUser({
      ...user,
      lastLoginAt: new Date(),
      organizationId: user.organizationId,
    });
    return this.startSession(user.id, user.organizationId, meta);
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<{ reset: true }> {
    const user = await this.otp.verify(email, code, OtpPurpose.PasswordReset);

    await this.transactionRunner.run(async () => {
      await this.userRepository.saveUser({
        ...user,
        passwordHash: await this.passwords.hash(newPassword),
        status: user.status === UserStatus.Invited ? UserStatus.Active : user.status,
        failedLoginCount: 0,
        lockedUntil: null,
        organizationId: user.organizationId,
      });
      await this.tokens.revokeAllForUser(user.organizationId, user.id);
    });

    await this.permissions.invalidate(user.id);
    return { reset: true };
  }

  async changePassword(
    userId: string,
    organizationId: string,
    sessionId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ changed: true }> {
    const user = await this.userRepository.findByIdInOrg(organizationId, userId);
    if (!user) {
      throw unauthorized();
    }

    const matches = await this.passwords.verify(user.passwordHash, currentPassword);
    if (!matches) {
      throw invalidCredentials();
    }

    await this.transactionRunner.run(async () => {
      await this.userRepository.saveUser({
        ...user,
        passwordHash: await this.passwords.hash(newPassword),
        organizationId,
      });
    });

    await this.permissions.invalidate(userId);
    return { changed: true };
  }

  async profileFor(userId: string, organizationId: string): Promise<MeResponse> {
    return toMe(await this.requireProfile(userId, organizationId));
  }

  private async recordFailure(user: User, now: Date): Promise<void> {
    const lockExpired = Boolean(user.lockedUntil && user.lockedUntil.getTime() <= now.getTime());
    const failedLoginCount = (lockExpired ? 0 : user.failedLoginCount) + 1;
    const lockedUntil =
      failedLoginCount >= MAX_LOGIN_FAILURES ? new Date(now.getTime() + LOGIN_LOCK_MS) : null;
    await this.userRepository.saveUser({
      ...user,
      failedLoginCount,
      lockedUntil,
      organizationId: user.organizationId,
    });
  }

  private async startSession(
    userId: string,
    organizationId: string,
    meta: ClientMeta,
  ): Promise<AuthenticatedSession> {
    await this.permissions.invalidate(userId);
    const tokens = await this.tokens.issue({ userId, organizationId, meta });
    const profile = await this.requireProfile(userId, organizationId);
    return { profile: toMe(profile), tokens };
  }

  private async requireProfile(userId: string, organizationId: string): Promise<AuthProfile> {
    const profile = await this.permissions.getProfile(userId, organizationId);
    if (!profile) {
      throw unauthorized();
    }

    if (profile.user.status === UserStatus.Suspended) {
      throw accountSuspended();
    }

    return profile;
  }
}

function toMe(profile: AuthProfile): MeResponse {
  return {
    user: profile.user,
    organization: profile.organization,
    roles: profile.roles,
    permissions: profile.permissions,
    isPlatformAdmin: profile.isPlatformAdmin,
  };
}

function invalidCredentials(): AppException {
  return new AppException(
    ErrorCode.INVALID_CREDENTIALS,
    'Invalid email or password',
    HttpStatus.UNAUTHORIZED,
  );
}

function unauthorized(): AppException {
  return new AppException(
    ErrorCode.UNAUTHORIZED,
    'Authentication required',
    HttpStatus.UNAUTHORIZED,
  );
}

function accountSuspended(): AppException {
  return new AppException(ErrorCode.ACCOUNT_SUSPENDED, 'Account suspended', HttpStatus.FORBIDDEN);
}

function accountLocked(lockedUntil: Date, now: Date): AppException {
  return new AppException(ErrorCode.ACCOUNT_LOCKED, 'Account locked', HttpStatus.LOCKED, {
    retryAfterSeconds: Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000)),
  });
}

function isExpired(error: unknown): boolean {
  return (
    error instanceof AppException &&
    typeof error.getResponse() === 'object' &&
    error.getResponse() !== null &&
    (error.getResponse() as { code?: string }).code === ErrorCode.TOKEN_EXPIRED
  );
}
