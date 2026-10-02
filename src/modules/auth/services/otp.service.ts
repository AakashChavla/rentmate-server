import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import type { Redis } from 'ioredis';
import { ErrorCode } from '../../../core/errors/error-codes';
import { AppException } from '../../../core/errors/app.exception';
import { AppConfigService } from '../../../core/config/app-config.service';
import { REDIS_CLIENT } from '../../../core/redis/redis.constants';
import { NotificationService } from '../../../core/notifications/notification.service';
import { UserRepository } from '../../users/repositories/user.repository';
import { OtpVerificationRepository } from '../repositories/otp-verification.repository';
import { OtpPurpose } from '../types/otp-purpose';
import { hashesEqual, sha256 } from '../../../shared/hashing';
import { User } from '../../users/entities/user.entity';

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const COOLDOWN_SECONDS = 60;
const FAILURE_WINDOW_SECONDS = 60 * 60;
const LOCK_SECONDS = 10 * 60;
const MAX_FAILURES = 5;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly otpRepository: OtpVerificationRepository,
    private readonly userRepository: UserRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly notificationService: NotificationService,
    private readonly config: AppConfigService,
  ) {}

  async send(email: string, purpose: OtpPurpose, now = new Date()): Promise<{ accepted: true }> {
    const normalized = normalizeEmail(email);
    if (await this.lockRetrySeconds(normalized, purpose)) {
      return { accepted: true };
    }

    const cooled = await this.redis.set(
      cooldownKey(normalized, purpose),
      '1',
      'EX',
      COOLDOWN_SECONDS,
      'NX',
    );
    if (cooled !== 'OK') {
      return { accepted: true };
    }

    const user = await this.userRepository.findByEmailForAuth(normalized);
    if (!user) {
      return { accepted: true };
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const existing = await this.otpRepository.findLatestActive(
      user.organizationId,
      user.id,
      purpose,
    );
    if (existing) {
      existing.consumedAt = now;
      await this.otpRepository.updateOtp(existing);
    }

    await this.otpRepository.saveOtp({
      organizationId: user.organizationId,
      userId: user.id,
      purpose: purpose as OtpPurpose,
      codeHash: sha256(code),
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      attempts: 0,
      consumedAt: null,
    });

    await this.notificationService.sendEmail(user.email, 'otp', {
      code,
      purpose,
      expiresInMinutes: 5,
    });

    if (this.config.authDevLogOtp) {
      this.logger.log({ email: user.email, purpose, otp: code }, 'Dev OTP');
    }

    return { accepted: true };
  }

  async verify(email: string, code: string, purpose: OtpPurpose, now = new Date()): Promise<User> {
    const normalized = normalizeEmail(email);
    const lockedFor = await this.lockRetrySeconds(normalized, purpose);
    if (lockedFor) {
      throw otpLocked(lockedFor);
    }

    const user = await this.userRepository.findByEmailForAuth(normalized);
    if (!user) {
      hashesEqual(sha256(code), sha256('000000'));
      const failure = await this.recordFailure(normalized, purpose);
      if (failure) {
        throw otpLocked(failure);
      }

      throw otpInvalid();
    }

    const current = await this.otpRepository.findLatestActive(
      user.organizationId,
      user.id,
      purpose,
    );

    if (!current) {
      await this.recordFailure(normalized, purpose);
      throw otpInvalid();
    }

    if (current.expiresAt.getTime() <= now.getTime()) {
      current.consumedAt = now;
      await this.otpRepository.updateOtp(current);
      await this.recordFailure(normalized, purpose);
      throw otpExpired();
    }

    if (current.attempts >= MAX_ATTEMPTS || !hashesEqual(current.codeHash, sha256(code))) {
      current.attempts += 1;
      if (current.attempts >= MAX_ATTEMPTS) {
        current.consumedAt = now;
      }
      await this.otpRepository.updateOtp(current);
      const failure = await this.recordFailure(normalized, purpose);
      if (failure) {
        throw otpLocked(failure);
      }

      throw otpInvalid();
    }

    current.consumedAt = now;
    await this.otpRepository.updateOtp(current);
    await this.redis.del(failureKey(normalized, purpose));
    return user;
  }

  private async lockRetrySeconds(email: string, purpose: OtpPurpose): Promise<number | null> {
    const ttl = await this.redis.ttl(lockKey(email, purpose));
    return ttl > 0 ? ttl : null;
  }

  private async recordFailure(email: string, purpose: OtpPurpose): Promise<number | null> {
    const key = failureKey(email, purpose);
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, FAILURE_WINDOW_SECONDS);
    }

    if (count < MAX_FAILURES) {
      return null;
    }

    await this.redis.set(lockKey(email, purpose), '1', 'EX', LOCK_SECONDS);
    return LOCK_SECONDS;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function failureKey(email: string, purpose: OtpPurpose): string {
  return `otp:fail:${purpose}:${email}`;
}

function lockKey(email: string, purpose: OtpPurpose): string {
  return `otp:lock:${purpose}:${email}`;
}

function cooldownKey(email: string, purpose: OtpPurpose): string {
  return `otp:cooldown:${purpose}:${email}`;
}

function otpInvalid(): AppException {
  return new AppException(ErrorCode.OTP_INVALID, 'OTP is invalid', HttpStatus.BAD_REQUEST);
}

function otpExpired(): AppException {
  return new AppException(ErrorCode.OTP_EXPIRED, 'OTP expired', HttpStatus.BAD_REQUEST);
}

function otpLocked(retryAfterSeconds: number): AppException {
  return new AppException(ErrorCode.OTP_LOCKED, 'OTP attempts are locked', HttpStatus.LOCKED, {
    retryAfterSeconds,
  });
}
