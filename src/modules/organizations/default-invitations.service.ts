import { Inject, Injectable } from '@nestjs/common';
import {
  InvitationRepository,
  InvitationsService,
  type InviteFilter,
  type InvitePage,
} from './invitations.contract';
import { InvitationPolicy } from './invitation-policy.contract';
import { OrganizationPropertyDirectory } from './organization-property.contract';
import { AuthRepository } from '../auth';
import { UserRepository } from '../users';
import { RoleRepository, PermissionContextLoader } from '../authorization';
import { InvitationToken } from '../../integrations/invitation-token/invitation-token.contract';
import { PasswordHasher } from '../../integrations/password/password-hasher.contract';
import { EmailProvider } from '../../integrations/email/email-provider.contract';
import { EmailPolicy } from '../../integrations/email-policy/email-policy.contract';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { Clock } from '../../core/time/clock.contract';
import { AppConfig } from '../../core/config/app-config.contract';
import { EventBus } from '../../core/events/event-bus.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import {
  INVITE_STATUS as S,
  INVITE_TTL,
  INVITE_TOKEN as T,
  DOMAIN_EVENT as E,
} from '../../shared/property.constants';
import { SCOPE, USER_STATUS, PASSWORD_POLICY } from '../../shared/identity.constants';
import type { PermissionContext } from '../../shared/identity.types';
import type { InviteInput, InviteRecord, InviteView } from '../../shared/property.types';
import { invitationView } from './invitation-view';
import { isUniqueViolation } from '../../core/database/database-errors';
@Injectable()
export class DefaultInvitationsService extends InvitationsService {
  public constructor(
    @Inject(InvitationRepository) private readonly repo: InvitationRepository,
    @Inject(InvitationPolicy) private readonly policy: InvitationPolicy,
    @Inject(OrganizationPropertyDirectory)
    private readonly properties: OrganizationPropertyDirectory,
    @Inject(AuthRepository) private readonly auth: AuthRepository,
    @Inject(UserRepository) private readonly users: UserRepository,
    @Inject(RoleRepository) private readonly roles: RoleRepository,
    @Inject(PermissionContextLoader) private readonly contexts: PermissionContextLoader,
    @Inject(InvitationToken) private readonly tokens: InvitationToken,
    @Inject(PasswordHasher) private readonly passwords: PasswordHasher,
    @Inject(EmailProvider) private readonly mail: EmailProvider,
    @Inject(EmailPolicy) private readonly emails: EmailPolicy,
    @Inject(TransactionRunner) private readonly tx: TransactionRunner,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(AppConfig) private readonly config: AppConfig,
    @Inject(EventBus) private readonly events: EventBus,
  ) {
    super();
  }
  public override async create(actor: PermissionContext, input: InviteInput): Promise<InviteView> {
    const scopeId = await this.policy.validate(actor, input);
    const email = input.email.toLowerCase();
    if (!this.emails.allowed(email)) throw new AppException(ErrorCode.VALIDATION_ERROR);
    return this.tx.run(async () => {
      await this.roles.lockOwners(actor.organization.id);
      if (
        (await this.auth.findIdentity(email)) ||
        (await this.repo.pending(actor.organization.id, email, this.clock.now()))
      )
        throw new AppException(ErrorCode.INVITE_DUPLICATE);
      const token = this.tokens.generate();
      const record = await this.repo.create(actor.organization.id, {
        email,
        roleId: input.roleKey,
        scopeType: input.scopeType,
        scopeId,
        propertyId: input.scopeType === SCOPE.PROPERTY ? scopeId : null,
        tokenHash: this.tokens.digest(token),
        status: S.PENDING,
        expiresAt: new Date(this.clock.now().getTime() + INVITE_TTL),
        invitedBy: actor.user.id,
        locale: actor.organization.defaultLocale,
      });
      await this.tx.afterCommit(() => this.send(record, token, actor.organization.name));
      return invitationView(record);
    });
  }
  public override async list(actor: PermissionContext, filter: InviteFilter): Promise<InvitePage> {
    const result = await this.repo.list(actor.organization.id, filter, this.policy.allowed(actor));
    return { ...result, items: result.items.map(invitationView) };
  }
  public override async resend(actor: PermissionContext, id: string): Promise<InviteView> {
    return this.tx.run(async () => {
      await this.roles.lockOwners(actor.organization.id);
      const record = await this.record(actor, id);
      if (record.status !== S.PENDING && record.status !== S.EXPIRED)
        throw new AppException(ErrorCode.INVITE_USED);
      await this.policy.validate(actor, {
        email: record.email,
        roleKey: record.roleId,
        scopeType: record.scopeType,
        scopeId: record.scopeId,
      });
      if (
        (await this.auth.findIdentity(record.email)) ||
        ((record.status === S.EXPIRED || record.expiresAt <= this.clock.now()) &&
          (await this.repo.pending(actor.organization.id, record.email, this.clock.now())))
      )
        throw new AppException(ErrorCode.INVITE_DUPLICATE);
      const token = this.tokens.generate();
      const expiresAt = new Date(this.clock.now().getTime() + INVITE_TTL);
      await this.repo.rotate(actor.organization.id, id, this.tokens.digest(token), expiresAt);
      await this.tx.afterCommit(() => this.send(record, token, actor.organization.name));
      return invitationView({ ...record, status: S.PENDING, expiresAt });
    });
  }
  public override async revoke(actor: PermissionContext, id: string): Promise<void> {
    await this.tx.run(async () => {
      const record = await this.record(actor, id);
      if (!(await this.repo.transition(actor.organization.id, id, record.status, S.REVOKED)))
        throw new AppException(ErrorCode.INVITE_USED);
      if (record.status === S.ACCEPTED) throw new AppException(ErrorCode.INVITE_USED);
    });
  }
  public override async accept(
    token: string,
    fullName: string,
    password: string,
  ): Promise<{ accepted: boolean; roleKey: string; locale: string }> {
    if (!PASSWORD_POLICY.test(password)) throw new AppException(ErrorCode.WEAK_PASSWORD);
    const hash = await this.passwords.hash(password);
    const found = await this.repo.findByDigest(this.tokens.digest(token));
    const matches = this.tokens.matches(token, found?.tokenHash ?? T.DUMMY);
    if (!found || !matches) throw new AppException(ErrorCode.INVITE_INVALID);
    const result = await this.tx
      .run(() => this.consume(found, token, fullName, hash))
      .catch((error: unknown) => {
        if (isUniqueViolation(error)) throw new AppException(ErrorCode.INVITE_DUPLICATE);
        throw error;
      });
    if (!result) throw new AppException(ErrorCode.INVITE_EXPIRED);
    return { accepted: true, roleKey: found.roleId, locale: found.locale };
  }
  private async consume(
    found: InviteRecord,
    token: string,
    fullName: string,
    hash: string,
  ): Promise<boolean> {
    const record = await this.repo.lock(found.organizationId, found.id);
    if (!record || !this.tokens.matches(token, record.tokenHash))
      throw new AppException(ErrorCode.INVITE_INVALID);
    if (record.status === S.EXPIRED) return false;
    if (record.status !== S.PENDING) throw new AppException(ErrorCode.INVITE_USED);
    if (record.expiresAt <= this.clock.now()) {
      await this.repo.transition(record.organizationId, record.id, S.PENDING, S.EXPIRED);
      return false;
    }
    if (
      record.scopeType === SCOPE.PROPERTY &&
      !(await this.properties.exists(record.organizationId, record.scopeId))
    )
      throw new AppException(ErrorCode.NOT_FOUND);
    if (await this.auth.findIdentity(record.email))
      throw new AppException(ErrorCode.INVITE_DUPLICATE);
    return this.activate(record, fullName, hash);
  }
  private async activate(record: InviteRecord, fullName: string, hash: string): Promise<boolean> {
    if (!(await this.repo.transition(record.organizationId, record.id, S.PENDING, S.ACCEPTED)))
      throw new AppException(ErrorCode.INVITE_USED);
    const user = await this.users.createInOrg(
      record.organizationId,
      {
        email: record.email,
        fullName,
        phone: null,
        locale: record.locale,
        status: USER_STATUS.ACTIVE,
        isPlatformAdmin: false,
      },
      hash,
    );
    await this.users.verifyEmail(record.organizationId, user.id, this.clock.now());
    await this.roles.assign(
      record.organizationId,
      user.id,
      record.roleId,
      record.scopeType,
      record.scopeId,
    );
    await this.tx.afterCommit(async () => {
      await this.contexts.invalidate(record.organizationId, user.id);
      this.events.publish(E.ACCEPTED, {
        organizationId: record.organizationId,
        userId: user.id,
        invitationId: record.id,
      });
    });
    return true;
  }
  private async record(actor: PermissionContext, id: string): Promise<InviteRecord> {
    const record = await this.repo.lock(actor.organization.id, id);
    if (!record) throw new AppException(ErrorCode.NOT_FOUND);
    this.policy.require(actor, record);
    return record;
  }
  private send(record: InviteRecord, token: string, organizationName: string): Promise<void> {
    return this.mail.enqueue({
      recipient: record.email,
      locale: record.locale,
      purpose: T.PURPOSE,
      inviteUrl: (this.config.get('CORS_ORIGIN')[0] ?? '') + '/accept-invite?token=' + token,
      organizationName,
    });
  }
}
