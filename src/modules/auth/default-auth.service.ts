import { Inject, Injectable } from '@nestjs/common';
import { AuthService, type SignedIn } from './auth.service.contract';
import { AuthRepository } from './repositories/auth.repository.contract';
import { OtpService } from './otp.service.contract';
import { SessionService } from './session.service.contract';
import { SessionRevoker } from './session.contract';
import { LoginLockout } from './login-lockout.contract';
import { OrganizationRepository } from '../organizations';
import { UserRepository } from '../users';
import { RoleRepository, PermissionContextLoader } from '../authorization';
import { PasswordHasher } from '../../integrations/password/password-hasher.contract';
import { BotProtection } from '../../integrations/bot/bot-protection.contract';
import { EmailPolicy } from '../../integrations/email-policy/email-policy.contract';
import { EmailProvider } from '../../integrations/email/email-provider.contract';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { IdGenerator } from '../../core/ids/id-generator.contract';
import { Clock } from '../../core/time/clock.contract';
import { SecurityEventLogger } from '../../core/logger/security-event-logger.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import {
  ROLE,
  USER_STATUS,
  OTP_PURPOSE,
  PASSWORD_POLICY,
  CONSENT,
  SECURITY_EVENT as E,
} from '../../shared/identity.constants';
import type {
  RegistrationInput,
  RequestMetadata,
  SessionClaims,
  IdentityUser,
} from '../../shared/identity.types';
@Injectable()
export class DefaultAuthService extends AuthService {
  public constructor(
    @Inject(AuthRepository) private readonly repository: AuthRepository,
    @Inject(OtpService) private readonly otp: OtpService,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(SessionRevoker) private readonly revoker: SessionRevoker,
    @Inject(LoginLockout) private readonly lockout: LoginLockout,
    @Inject(OrganizationRepository) private readonly organizations: OrganizationRepository,
    @Inject(UserRepository) private readonly users: UserRepository,
    @Inject(RoleRepository) private readonly roles: RoleRepository,
    @Inject(PermissionContextLoader) private readonly contexts: PermissionContextLoader,
    @Inject(PasswordHasher) private readonly hasher: PasswordHasher,
    @Inject(BotProtection) private readonly bot: BotProtection,
    @Inject(EmailPolicy) private readonly policy: EmailPolicy,
    @Inject(EmailProvider) private readonly email: EmailProvider,
    @Inject(TransactionRunner) private readonly tx: TransactionRunner,
    @Inject(IdGenerator) private readonly ids: IdGenerator,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(SecurityEventLogger) private readonly events: SecurityEventLogger,
  ) {
    super();
  }
  public override async register(
    input: RegistrationInput,
    metadata: RequestMetadata,
  ): Promise<void> {
    checkPassword(input.password);
    await this.bot.check(metadata.ip);
    if (
      !this.policy.allowed(input.email) ||
      !input.acceptTerms ||
      input.termsVersion !== CONSENT.VERSION
    )
      throw new AppException(ErrorCode.VALIDATION_ERROR);
    const passwordHash = await this.hasher.hash(input.password);
    const existing = await this.repository.findIdentity(input.email);
    if (existing) {
      await this.existingEmail(existing.user);
      return;
    }
    try {
      await this.tx.run(() => this.createRegistration(input, metadata, passwordHash));
    } catch (error) {
      if (isUniqueViolation(error)) {
        const identity = await this.repository.findIdentity(input.email);
        if (identity) {
          await this.existingEmail(identity.user);
          return;
        }
      }
      throw error;
    }
  }
  private async createRegistration(
    input: RegistrationInput,
    metadata: RequestMetadata,
    passwordHash: string,
  ): Promise<void> {
    const organization = await this.organizations.create(
      input.organizationName,
      `${slug(input.organizationName)}-${this.ids.next()}`,
      input.locale,
    );
    const user = await this.users.createInOrg(
      organization.id,
      {
        email: input.email,
        fullName: input.fullName,
        phone: input.phone ?? null,
        locale: input.locale,
        status: USER_STATUS.PENDING,
        isPlatformAdmin: false,
      },
      passwordHash,
    );
    await this.roles.assign(organization.id, user.id, ROLE.OWNER);
    await this.repository.consent(organization.id, user.id, input, metadata.ip, this.clock.now());
    await this.tx.afterCommit(async () => {
      await this.otp.sendTo(user, OTP_PURPOSE.VERIFY);
      this.events.record(E.REGISTERED, { userId: user.id, organizationId: organization.id });
    });
  }
  private existingEmail(user: IdentityUser): Promise<void> {
    return this.email.enqueue({
      recipient: user.email,
      locale: user.locale,
      purpose: 'account-exists',
    });
  }
  public override async verifyRegistration(
    email: string,
    code: string,
    metadata: RequestMetadata,
  ): Promise<SignedIn> {
    const user = await this.tx.run(async () => {
      const pending = await this.otp.consume(email, code, OTP_PURPOSE.VERIFY);
      if (pending.status !== USER_STATUS.PENDING) throw new AppException(ErrorCode.OTP_INVALID);
      await this.users.verifyEmail(pending.organizationId, pending.id, this.clock.now());
      await this.organizations.activate(pending.organizationId);
      return pending;
    });
    this.events.record(E.VERIFIED, { userId: user.id, organizationId: user.organizationId });
    return this.signIn(user, metadata);
  }
  public override async login(
    email: string,
    password: string,
    metadata: RequestMetadata,
  ): Promise<SignedIn> {
    await this.lockout.check(email, metadata.ip);
    const identity = await this.repository.findIdentity(email);
    const valid = identity?.passwordHash
      ? await this.hasher.verify(identity.passwordHash, password)
      : false;
    if (!identity?.passwordHash) await this.hasher.dummyVerify(password);
    if (!identity || !valid) {
      await this.lockout.failure(email, metadata.ip);
      throw new AppException(ErrorCode.INVALID_CREDENTIALS);
    }
    active(identity.user);
    await this.lockout.success(email, metadata.ip);
    return this.signIn(identity.user, metadata);
  }
  public override async otpLogin(
    email: string,
    code: string,
    metadata: RequestMetadata,
  ): Promise<SignedIn> {
    const user = await this.otp.consume(email, code, OTP_PURPOSE.LOGIN);
    active(user);
    return this.signIn(user, metadata);
  }
  private async signIn(user: IdentityUser, metadata: RequestMetadata): Promise<SignedIn> {
    await this.users.recordLoginSuccess(user.organizationId, user.id, this.clock.now());
    await this.contexts.invalidate(user.organizationId, user.id);
    const tokens = await this.sessions.create(user.organizationId, user.id, metadata);
    const me = await this.contexts.load(user.organizationId, user.id);
    this.events.record(E.LOGIN_SUCCESS, { userId: user.id, organizationId: user.organizationId });
    return { tokens, me };
  }
  public override async reset(email: string, code: string, password: string): Promise<void> {
    checkPassword(password);
    const hash = await this.hasher.hash(password);
    const user = await this.tx.run(async () => {
      const user = await this.otp.consume(email, code, OTP_PURPOSE.RESET);
      await this.users.setPasswordHash(user.organizationId, user.id, hash);
      await this.revoker.revokeUser(user.organizationId, user.id);
      return user;
    });
    this.events.record(E.RESET, { userId: user.id, organizationId: user.organizationId });
  }
  public override async change(
    claims: SessionClaims,
    currentPassword: string,
    password: string,
  ): Promise<void> {
    checkPassword(password);
    const user = await this.users.findByIdInOrg(claims.org, claims.sub);
    if (!user) throw new AppException(ErrorCode.UNAUTHORIZED);
    const identity = await this.repository.findIdentity(user.email);
    if (
      !identity?.passwordHash ||
      !(await this.hasher.verify(identity.passwordHash, currentPassword))
    )
      throw new AppException(ErrorCode.INVALID_CREDENTIALS);
    const hash = await this.hasher.hash(password);
    await this.tx.run(async () => {
      await this.users.setPasswordHash(claims.org, claims.sub, hash);
      await this.revoker.revokeUser(claims.org, claims.sub, claims.fid);
    });
    this.events.record(E.CHANGED, { userId: claims.sub, organizationId: claims.org });
  }
}
function checkPassword(password: string): void {
  if (!PASSWORD_POLICY.test(password)) throw new AppException(ErrorCode.WEAK_PASSWORD);
}
function active(user: IdentityUser): void {
  if (user.status === USER_STATUS.SUSPENDED) throw new AppException(ErrorCode.ACCOUNT_SUSPENDED);
  if (user.status !== USER_STATUS.ACTIVE) throw new AppException(ErrorCode.INVALID_CREDENTIALS);
}
function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, SLUG_MAX) || 'organization'
  );
}
function isUniqueViolation(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'code' in error && error.code === UNIQUE_VIOLATION;
}
const UNIQUE_VIOLATION = '23505';

const SLUG_MAX = 100;
