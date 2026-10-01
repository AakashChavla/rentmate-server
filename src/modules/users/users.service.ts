import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { TenantRepository } from '../../common/base/tenant.repository';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { PaginatedResult } from '../../common/interceptors/paginated-result';
import { decodeCursor, encodeCursor, InvalidCursorError } from '../../common/utils/cursor';
import { PermissionService } from '../authorization/permission.service';
import { Role, RoleKey } from '../authorization/entities/role.entity';
import { ScopeType } from '../authorization/scope-type';
import { UserRoleAssignment } from '../authorization/entities/user-role-assignment.entity';
import { TokenService } from '../auth/token.service';
import { User, UserStatus } from './entities/user.entity';

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
export class UsersService {
  private readonly users: TenantRepository<User>;
  private readonly assignments: TenantRepository<UserRoleAssignment>;

  constructor(
    @InjectRepository(User) users: Repository<User>,
    @InjectRepository(UserRoleAssignment) assignments: Repository<UserRoleAssignment>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    private readonly tokens: TokenService,
    private readonly permissions: PermissionService,
  ) {
    this.users = new TenantRepository(users);
    this.assignments = new TenantRepository(assignments);
  }

  async list(organizationId: string, query: UserListQuery): Promise<PaginatedResult<UserView[]>> {
    const limit = query.limit ?? 20;
    const qb = this.users.scopedQueryBuilder(organizationId, 'user');
    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere("(user.email ILIKE :search OR user.full_name ILIKE :search ESCAPE '\\')", {
        search: likePattern(query.search),
      });
    }

    if (query.cursor) {
      try {
        const cursor = decodeCursor(query.cursor);
        qb.andWhere('(user.created_at, user.id) < (:createdAt, :id)', {
          createdAt: cursor.createdAt,
          id: cursor.id,
        });
      } catch (error) {
        if (error instanceof InvalidCursorError) {
          throw new AppException(
            ErrorCode.BAD_REQUEST,
            'Cursor is invalid',
            HttpStatus.BAD_REQUEST,
          );
        }

        throw error;
      }
    }

    const rows = await qb
      .orderBy('user.created_at', 'DESC')
      .addOrderBy('user.id', 'DESC')
      .take(limit + 1)
      .getMany();
    const hasNext = rows.length > limit;
    const page = hasNext ? rows.slice(0, limit) : rows;
    const last = page.at(-1);
    const views = await this.withRoles(organizationId, page);
    return new PaginatedResult(views, {
      limit,
      hasNext,
      nextCursor: hasNext && last ? encodeCursor(last.createdAt, last.id) : null,
    });
  }

  async get(organizationId: string, userId: string): Promise<UserView> {
    const user = await this.users.findOne(organizationId, { where: { id: userId } });
    if (!user) {
      throw notFound();
    }

    const [view] = await this.withRoles(organizationId, [user]);
    return view;
  }

  async update(
    actor: AuthenticatedUser,
    userId: string,
    input: { fullName?: string; phone?: string | null; status?: UserStatus },
  ): Promise<UserView> {
    const user = await this.users.findOne(actor.organizationId, { where: { id: userId } });
    if (!user) {
      throw notFound();
    }

    if (input.status === UserStatus.Suspended && actor.id === user.id) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'You cannot suspend your own account',
        HttpStatus.FORBIDDEN,
      );
    }

    const saved = await this.users.save(actor.organizationId, {
      ...user,
      fullName: input.fullName ?? user.fullName,
      phone: input.phone === undefined ? user.phone : input.phone,
      status: input.status ?? user.status,
    });

    if (saved.status === UserStatus.Suspended) {
      await this.tokens.revokeAllForUser(actor.organizationId, saved.id);
    }

    await this.permissions.invalidate(saved.id);
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

    const user = await this.users.findOne(actor.organizationId, { where: { id: userId } });
    if (!user) {
      throw notFound();
    }

    const role = await this.roles.findOne({ where: { key: input.roleKey, isSystem: true } });
    if (!role) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Role not found', HttpStatus.NOT_FOUND);
    }

    try {
      const saved = await this.assignments.save(actor.organizationId, {
        userId: user.id,
        roleId: role.id,
        scopeType: ScopeType.Organization,
        scopeId: actor.organizationId,
        assignedBy: actor.id,
        expiresAt: null,
      });
      await this.permissions.invalidate(user.id);
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
    const assignment = await this.assignments.findOne(actor.organizationId, {
      where: { id: assignmentId, userId },
    });
    if (!assignment) {
      throw notFound();
    }

    const role = await this.roles.findOne({ where: { id: assignment.roleId } });
    if (role?.key === 'ORG_OWNER' && isActive(assignment.expiresAt)) {
      const owners = await this.countActiveOwners(actor.organizationId);
      if (owners <= 1) {
        throw new AppException(
          ErrorCode.LAST_OWNER,
          'The last organization owner cannot be removed',
          HttpStatus.CONFLICT,
        );
      }
    }

    await this.assignments.softDelete(actor.organizationId, { id: assignment.id });
    await this.permissions.invalidate(userId);
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

  private async countActiveOwners(organizationId: string): Promise<number> {
    const role = await this.roles.findOne({ where: { key: RoleKey.OrgOwner } });
    if (!role) {
      return 0;
    }

    const rows = await this.assignments.find(organizationId, {
      where: {
        roleId: role.id,
        scopeType: ScopeType.Organization,
        scopeId: organizationId,
      },
    });
    return rows.filter((row) => isActive(row.expiresAt)).length;
  }

  private async withRoles(organizationId: string, users: User[]): Promise<UserView[]> {
    if (users.length === 0) {
      return [];
    }

    const rows = await this.assignments
      .scopedQueryBuilder(organizationId, 'assignment')
      .innerJoin(Role, 'role', 'role.id = assignment.role_id')
      .andWhere('assignment.user_id IN (:...userIds)', { userIds: users.map((user) => user.id) })
      .select([
        'assignment.userId AS user_id',
        'assignment.scopeType AS scope_type',
        'assignment.scopeId AS scope_id',
        'assignment.expiresAt AS expires_at',
        'role.key AS role_key',
      ])
      .getRawMany<{
        user_id: string;
        scope_type: ScopeType;
        scope_id: string;
        expires_at: Date | string | null;
        role_key: string;
      }>();

    const byUser = new Map<string, UserView['roles']>();
    for (const row of rows) {
      if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
        continue;
      }

      const list = byUser.get(row.user_id) ?? [];
      list.push({ key: row.role_key, scopeType: row.scope_type, scopeId: row.scope_id });
      byUser.set(row.user_id, list);
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
}

function isActive(expiresAt: Date | null): boolean {
  return !expiresAt || expiresAt.getTime() > Date.now();
}

function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

function notFound(): AppException {
  return new AppException(ErrorCode.NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505'
  );
}
