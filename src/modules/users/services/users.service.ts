import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../core/errors/error-codes';
import { AppException } from '../../../core/errors/app.exception';
import { PaginatedResult } from '../../../core/http/interceptors/paginated-result';
import type { AuthenticatedUser } from '../../../core/http/decorators/current-user.decorator';
import { TransactionRunner } from '../../../core/database/transaction-runner';
import { UserRepository } from '../repositories/user.repository';
import { UserRoleAssignmentRepository } from '../../authorization/repositories/user-role-assignment.repository';
import { RoleRepository } from '../../authorization/repositories/role.repository';
import { PermissionChecker } from '../../authorization/contracts/permission-checker.contract';
import { SessionRevoker } from '../../auth/contracts/session-revoker.contract';
import { ScopeType } from '../../authorization/types/scope-type';
import { User, UserStatus } from '../entities/user.entity';
import { UserDirectory, UserRecord } from '../contracts/user-directory.contract';

export interface UserView {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: UserStatus;
  lastLoginAt: Date | null;
  roles: { key: string; scopeType: ScopeType; scopeId: string }[];
}

export interface UserListQuery {
  status?: UserStatus;
  search?: string;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class UsersService implements UserDirectory {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly assignmentRepository: UserRoleAssignmentRepository,
    private readonly roleRepository: RoleRepository,
    @Inject(SessionRevoker)
    private readonly sessionRevoker: SessionRevoker,
    @Inject(PermissionChecker)
    private readonly permissionChecker: PermissionChecker,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  // UserDirectory contract implementation
  async findByEmailForAuth(email: string): Promise<UserRecord | null> {
    const user = await this.userRepository.findByEmailForAuth(email);
    if (!user) return null;
    return this.toRecord(user);
  }

  async findById(organizationId: string, userId: string): Promise<UserRecord | null> {
    const user = await this.userRepository.findByIdInOrg(organizationId, userId);
    if (!user) return null;
    return this.toRecord(user);
  }

  async updateLastLogin(organizationId: string, userId: string): Promise<void> {
    await this.userRepository.updateLastLogin(organizationId, userId);
  }

  async list(organizationId: string, query: UserListQuery): Promise<PaginatedResult<UserView[]>> {
    const { users, nextCursor, hasNext, limit } = await this.userRepository.listPage(
      organizationId,
      query,
    );
    const views = await this.withRoles(organizationId, users);
    return new PaginatedResult(views, { limit, hasNext, nextCursor });
  }

  async get(organizationId: string, userId: string): Promise<UserView> {
    const user = await this.userRepository.findByIdInOrg(organizationId, userId);
    if (!user) throw notFound();

    const [view] = await this.withRoles(organizationId, [user]);
    return view;
  }

  async update(
    actor: AuthenticatedUser,
    userId: string,
    input: { fullName?: string; phone?: string | null; status?: UserStatus },
  ): Promise<UserView> {
    const user = await this.userRepository.findByIdInOrg(actor.organizationId, userId);
    if (!user) throw notFound();

    if (input.status === UserStatus.Suspended && actor.id === user.id) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'You cannot suspend your own account',
        HttpStatus.FORBIDDEN,
      );
    }

    const updatedStatus = input.status ?? user.status;
    const isSuspended = updatedStatus === UserStatus.Suspended;

    const saved = await this.transactionRunner.run(async () => {
      const u = await this.userRepository.saveUser({
        ...user,
        fullName: input.fullName ?? user.fullName,
        phone: input.phone === undefined ? user.phone : input.phone,
        status: updatedStatus,
        organizationId: actor.organizationId,
      });

      if (isSuspended) {
        await this.sessionRevoker.revokeAllForUser(actor.organizationId, u.id);
      }
      return u;
    });

    await this.permissionChecker.invalidateUserCache(saved.id);
    const [view] = await this.withRoles(actor.organizationId, [saved]);
    return view;
  }

  async assignRole(
    actor: AuthenticatedUser,
    userId: string,
    input: { roleKey: string; scopeType: ScopeType; scopeId?: string },
  ): Promise<{ id: string; roleKey: string; scopeType: ScopeType; scopeId: string }> {
    this.assertOwner(actor);
    if (input.roleKey === 'SUPER_ADMIN') {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'SUPER_ADMIN cannot be assigned through this API',
        HttpStatus.FORBIDDEN,
      );
    }

    if (input.scopeType === ScopeType.Property) {
      throw new AppException(
        ErrorCode.NOT_SUPPORTED_YET,
        'Property scope is not supported yet',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (input.scopeId && input.scopeId !== actor.organizationId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Organization scope is taken from the session',
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.userRepository.findByIdInOrg(actor.organizationId, userId);
    if (!user) throw notFound();

    const role = await this.roleRepository.findSystemRoleByKey(input.roleKey);
    if (!role) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Role not found', HttpStatus.NOT_FOUND);
    }

    try {
      const saved = await this.transactionRunner.run(async () => {
        return this.assignmentRepository.saveAssignment(actor.organizationId, {
          userId: user.id,
          roleId: role.id,
          scopeType: ScopeType.Organization,
          scopeId: actor.organizationId,
          assignedBy: actor.id,
          expiresAt: null,
        });
      });

      await this.permissionChecker.invalidateUserCache(user.id);
      return {
        id: saved.id,
        roleKey: role.key,
        scopeType: saved.scopeType,
        scopeId: saved.scopeId,
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppException(
          ErrorCode.CONFLICT,
          'Role assignment already exists',
          HttpStatus.CONFLICT,
        );
      }

      throw error;
    }
  }

  async removeRole(
    actor: AuthenticatedUser,
    userId: string,
    assignmentId: string,
  ): Promise<{ removed: true }> {
    this.assertOwner(actor);
    const assignment = await this.assignmentRepository.findAssignmentById(
      actor.organizationId,
      userId,
      assignmentId,
    );
    if (!assignment) throw notFound();

    const role = await this.roleRepository.findById(assignment.roleId);
    if (role?.key === 'ORG_OWNER' && isActive(assignment.expiresAt)) {
      const owners = await this.assignmentRepository.countActiveOwners(
        actor.organizationId,
        role.id,
      );
      if (owners <= 1) {
        throw new AppException(
          ErrorCode.LAST_OWNER,
          'The last organization owner cannot be removed',
          HttpStatus.CONFLICT,
        );
      }
    }

    await this.transactionRunner.run(async () => {
      await this.assignmentRepository.softDeleteAssignment(actor.organizationId, assignment.id);
    });

    await this.permissionChecker.invalidateUserCache(userId);
    return { removed: true };
  }

  private assertOwner(actor: AuthenticatedUser): void {
    const owner = actor.grants.some(
      (grant) =>
        grant.roleKey === 'ORG_OWNER' &&
        grant.scopeType === 'ORGANIZATION' &&
        grant.scopeId === actor.organizationId &&
        (!grant.expiresAt || Date.parse(grant.expiresAt) > Date.now()),
    );
    if (!owner) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Organization owner role required',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async withRoles(organizationId: string, users: User[]): Promise<UserView[]> {
    if (users.length === 0) return [];
    const rows = await this.assignmentRepository.findAssignmentsForUsers(
      organizationId,
      users.map((u) => u.id),
    );

    const byUser = new Map<string, UserView['roles']>();
    for (const row of rows) {
      if (row.expiresAt && new Date(row.expiresAt).getTime() <= Date.now()) {
        continue;
      }
      const list = byUser.get(row.userId) ?? [];
      list.push({ key: row.roleKey, scopeType: row.scopeType, scopeId: row.scopeId });
      byUser.set(row.userId, list);
    }

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      roles: byUser.get(user.id) ?? [],
    }));
  }

  private toRecord(user: User): UserRecord {
    return {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      passwordHash: user.passwordHash,
      fullName: user.fullName,
      phone: user.phone,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

function isActive(expiresAt: Date | null): boolean {
  return !expiresAt || expiresAt.getTime() > Date.now();
}

function notFound(): AppException {
  return new AppException(ErrorCode.NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505'
  );
}
