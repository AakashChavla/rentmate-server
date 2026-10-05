import { Inject, Injectable } from '@nestjs/common';
import { OtpService } from './otp.service.contract';
import { AuthRepository } from './repositories/auth.repository.contract';
import { OtpGenerator } from '../../integrations/otp/otp-generator.contract';
import { EmailProvider } from '../../integrations/email/email-provider.contract';
import { KeyValueStore } from '../../core/redis/key-value-store.contract';
import { IdGenerator } from '../../core/ids/id-generator.contract';
import { Clock } from '../../core/time/clock.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { SecurityEventLogger } from '../../core/logger/security-event-logger.contract';
import {
  IDENTITY_KEYS as K,
  IDENTITY_TTL as T,
  IDENTITY_LIMITS as L,
  USER_STATUS,
  SECURITY_EVENT as E,
  OTP_PURPOSE,
} from '../../shared/identity.constants';
import { sha256 } from './default-session.service';
import type { IdentityUser, OtpRecord } from '../../shared/identity.types';
@Injectable()
export class DefaultOtpService extends OtpService {
  public constructor(
    @Inject(AuthRepository) private readonly repository: AuthRepository,
    @Inject(OtpGenerator) private readonly generator: OtpGenerator,
    @Inject(EmailProvider) private readonly email: EmailProvider,
    @Inject(KeyValueStore) private readonly store: KeyValueStore,
    @Inject(IdGenerator) private readonly ids: IdGenerator,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(SecurityEventLogger) private readonly events: SecurityEventLogger,
  ) {
    super();
  }
  public override async send(email: string, purpose: OtpRecord['purpose']): Promise<void> {
    const identity = await this.repository.findIdentity(email);
    const hash = sha256(email);
    const reserved = await this.store.incrementWindow(K.resend(hash, purpose), T.RESEND);
    if (reserved > 1) return;
    if (!identity) return;
    const user = identity.user;
    if (
      purpose === OTP_PURPOSE.VERIFY
        ? user.status !== USER_STATUS.PENDING
        : user.status !== USER_STATUS.ACTIVE
    )
      return;
    await this.issue(user, purpose);
  }
  public override async sendTo(user: IdentityUser, purpose: OtpRecord['purpose']): Promise<void> {
    if ((await this.store.incrementWindow(K.resend(sha256(user.email), purpose), T.RESEND)) > 1)
      return;
    await this.issue(user, purpose);
  }
  private async issue(user: IdentityUser, purpose: OtpRecord['purpose']): Promise<void> {
    const id = this.ids.next();
    const code = this.generator.generate();
    const context = `${id}:${user.id}:${purpose}`;
    await this.repository.createOtp({
      id,
      organizationId: user.organizationId,
      userId: user.id,
      purpose,
      codeHash: this.generator.digest(code, context),
      expiresAt: new Date(this.clock.now().getTime() + T.OTP),
    });
    await this.email.enqueue({ recipient: user.email, locale: user.locale, purpose, code });
    this.events.record(E.OTP_SENT, { userId: user.id, organizationId: user.organizationId });
  }
  public override async consume(
    email: string,
    code: string,
    purpose: OtpRecord['purpose'],
  ): Promise<IdentityUser> {
    const hash = sha256(email);
    if (await this.store.get(K.otpLock(hash))) throw new AppException(ErrorCode.OTP_LOCKED);
    const identity = await this.repository.findIdentity(email);
    const record = await this.record(identity?.user, purpose);
    const count = await this.reserve(record, hash, purpose);
    if (count > L.OTP_ATTEMPTS) {
      await this.failed(email, hash);
      throw new AppException(ErrorCode.OTP_LOCKED);
    }
    if (!record || !identity) {
      await this.failed(email, hash);
      throw new AppException(ErrorCode.OTP_INVALID);
    }
    if (record.expiresAt <= this.clock.now()) throw new AppException(ErrorCode.OTP_EXPIRED);
    if (
      !this.generator.matches(code, `${record.id}:${record.userId}:${purpose}`, record.codeHash)
    ) {
      await this.failed(email, hash);
      throw new AppException(ErrorCode.OTP_INVALID);
    }
    if (
      !(await this.repository.consumeOtp(
        record.organizationId,
        record.userId,
        record.id,
        this.clock.now(),
      ))
    )
      throw new AppException(ErrorCode.OTP_INVALID);
    return identity.user;
  }
  private reserve(
    record: OtpRecord | null,
    hash: string,
    purpose: OtpRecord['purpose'],
  ): Promise<number> {
    return this.store.incrementWindow(K.otp(record?.id ?? `${hash}:${purpose}`), T.OTP);
  }
  private record(
    user: IdentityUser | undefined,
    purpose: OtpRecord['purpose'],
  ): Promise<OtpRecord | null> {
    return user
      ? this.repository.latestOtp(user.organizationId, user.id, purpose)
      : Promise.resolve(null);
  }
  private async failed(email: string, hash: string): Promise<void> {
    this.events.record(E.OTP_FAILED, { email });
    const count = await this.store.incrementWindow(K.otpFailures(hash), T.EMAIL_WINDOW);
    if (count >= L.EMAIL_FAILURES) {
      await this.store.set(K.otpLock(hash), 'locked', T.OTP_LOCK);
      this.events.record(E.OTP_LOCKED, { email });
    }
  }
}
