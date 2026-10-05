import { OrganizationPropertyDirectory } from '../organizations';
import { Inject, Injectable } from '@nestjs/common';
import { UsersService, UserRepository } from './users.contract';
import { SessionRevoker } from '../auth';
import { RoleRepository, PermissionContextLoader, PermissionChecker } from '../authorization';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { SecurityEventLogger } from '../../core/logger/security-event-logger.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { ROLE, SCOPE, USER_STATUS, SECURITY_EVENT as E } from '../../shared/identity.constants';
import type { IdentityUser, UserPatch } from '../../shared/identity.types';
@Injectable()
export class DefaultUsersService extends UsersService {
  public constructor(
    @Inject(UserRepository) private readonly users: UserRepository,
    @Inject(SessionRevoker) private readonly sessions: SessionRevoker,
    @Inject(RoleRepository) private readonly roles: RoleRepository,
    @Inject(PermissionContextLoader) private readonly contexts: PermissionContextLoader,
    @Inject(PermissionChecker) private readonly permissions: PermissionChecker,
    @Inject(TransactionRunner) private readonly tx: TransactionRunner,
    @Inject(SecurityEventLogger) private readonly events: SecurityEventLogger,
    @Inject(OrganizationPropertyDirectory)
    private readonly properties: OrganizationPropertyDirectory,
  ) {
    super();
  }
  public override async get(org: string, id: string): Promise<IdentityUser> {
    const user = await this.users.findByIdInOrg(org, id);
    if (!user) throw new AppException(ErrorCode.NOT_FOUND);
    return { ...user, roles: (await this.roles.context(org, id)).roles };
  }
  public override async list(
    org: string,
    cursor?: string,
    status?: string,
    search?: string,
  ): ReturnType<UserRepository['listInOrg']> {
    const result = await this.users.listInOrg(org, cursor, status, search);
    const roles = await this.roles.forUsers(
      org,
      result.items.map((user) => user.id),
    );
    return {
      ...result,
      items: result.items.map((user) => ({
        ...user,
        roles: roles.filter((role) => role.userId === user.id),
      })),
    };
  }
  public override async profile(org: string, id: string, patch: UserPatch): Promise<IdentityUser> {
    await this.users.updateProfile(org, id, patch);
    await this.contexts.invalidate(org, id);
    return this.get(org, id);
  }
  public override async update(
    org: string,
    actor: string,
    id: string,
    patch: UserPatch,
  ): Promise<IdentityUser> {
    await this.tx.run(async () => {
      await this.get(org, id);
      await this.requirePermission(org, actor, 'user:update');
      if (patch.status === USER_STATUS.SUSPENDED) {
        if (actor === id) throw new AppException(ErrorCode.FORBIDDEN);
        const owners = await this.roles.lockOwners(org);
        if (owners.includes(id) && owners.length <= 1) throw new AppException(ErrorCode.LAST_OWNER);
        await this.users.setStatus(org, id, USER_STATUS.SUSPENDED);
        await this.sessions.revokeUser(org, id);
        this.events.record(E.SUSPENDED, { userId: id, organizationId: org });
      }
      const { status, ...profile } = patch;
      if (status && status !== USER_STATUS.SUSPENDED) await this.users.setStatus(org, id, status);
      if (Object.keys(profile).length) await this.users.updateProfile(org, id, profile);
      await this.tx.afterCommit(() => this.contexts.invalidate(org, id));
    });
    return this.get(org, id);
  }
  public override async assign(
    org: string,
    actor: string,
    id: string,
    role: string,
    scope: string,
    scopeId?: string,
  ): Promise<void> {
    const targetScope = await this.roleScope(org, role, scope, scopeId);
    if (role === ROLE.SUPER_ADMIN || !Object.values(ROLE).includes(role as typeof ROLE.OWNER))
      throw new AppException(ErrorCode.FORBIDDEN);
    await this.tx.run(async () => {
      await this.roles.lockOwners(org);
      await this.owner(org, actor);
      await this.get(org, id);
      await this.roles.assign(org, id, role, scope, targetScope);
      await this.tx.afterCommit(() => this.contexts.invalidate(org, id));
    });
    this.events.record(E.ASSIGNED, { userId: id, organizationId: org });
  }
  public override async remove(
    org: string,
    actor: string,
    id: string,
    assignment: string,
  ): Promise<void> {
    await this.tx.run(async () => {
      const owners = await this.roles.lockOwners(org);
      await this.owner(org, actor);
      await this.get(org, id);
      const context = await this.roles.context(org, id);
      const target = context.roles.find((role) => role.id === assignment);
      if (!target) throw new AppException(ErrorCode.NOT_FOUND);
      if (target.role === ROLE.SUPER_ADMIN) throw new AppException(ErrorCode.FORBIDDEN);
      if (target.role === ROLE.OWNER && owners.includes(id) && owners.length <= 1)
        throw new AppException(ErrorCode.LAST_OWNER);
      await this.roles.remove(org, id, assignment);
      await this.tx.afterCommit(() => this.contexts.invalidate(org, id));
    });
    this.events.record(E.REMOVED, { userId: id, organizationId: org });
  }
  private async roleScope(
    org: string,
    role: string,
    scope: string,
    scopeId: string | undefined,
  ): Promise<string> {
    const targetScope = scopeId ?? org;
    if (scope === SCOPE.PROPERTY && (!scopeId || !(await this.properties.exists(org, targetScope))))
      throw new AppException(ErrorCode.NOT_FOUND);
    if (scope === SCOPE.ORGANIZATION && targetScope !== org)
      throw new AppException(ErrorCode.NOT_FOUND);
    if (scope === SCOPE.PROPERTY && role === ROLE.OWNER)
      throw new AppException(ErrorCode.FORBIDDEN);

    return targetScope;
  }
  private async owner(org: string, id: string): Promise<void> {
    const user = await this.get(org, id);
    const context = await this.roles.context(org, id);
    if (
      user.status !== USER_STATUS.ACTIVE ||
      !context.roles.some((r) => r.role === ROLE.OWNER && r.scope === SCOPE.ORGANIZATION)
    )
      throw new AppException(ErrorCode.FORBIDDEN);
  }
  private async requirePermission(org: string, id: string, permission: string): Promise<void> {
    if (!this.permissions.can(await this.contexts.load(org, id), permission))
      throw new AppException(ErrorCode.FORBIDDEN);
  }
}
