import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Redis } from 'ioredis';
import type { Repository } from 'typeorm';
import { TenantRepository } from '../../common/base/tenant.repository';
import type {
  AuthenticatedUser,
  AuthScopeType,
  PermissionGrant,
} from '../../common/decorators/current-user.decorator';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import { Organization } from '../organizations/entities/organization.entity';
import { User, UserStatus } from '../users/entities/user.entity';
import { canAccess, holdsPermission, type ResourceCheck } from './permission-check';
import { Permission } from './entities/permission.entity';
import { PLATFORM_PERMISSION } from './permission-catalog';
import { Role } from './entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserRoleAssignment } from './entities/user-role-assignment.entity';

const CACHE_TTL_SECONDS = 15 * 60;

export interface AuthProfile {
  user: {
    id: string;
    email: string;
    fullName: string;
    status: UserStatus;
    organizationId: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    plan: string;
  };
  roles: { key: string; scopeType: AuthScopeType; scopeId: string }[];
  permissions: string[];
  isPlatformAdmin: boolean;
  grants: PermissionGrant[];
}

@Injectable()
export class PermissionService {
  private readonly assignments: TenantRepository<UserRoleAssignment>;
  private readonly users: TenantRepository<User>;

  constructor(
    @InjectRepository(UserRoleAssignment) assignments: Repository<UserRoleAssignment>,
    @InjectRepository(User) users: Repository<User>,
    @InjectRepository(Organization) private readonly organizations: Repository<Organization>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.assignments = new TenantRepository(assignments);
    this.users = new TenantRepository(users);
  }

  holds(user: AuthenticatedUser, permission: string): boolean {
    return holdsPermission(user, permission);
  }

  can(user: AuthenticatedUser, permission: string, options?: ResourceCheck): boolean {
    return canAccess(user, permission, options);
  }

  async getProfile(userId: string, organizationId: string): Promise<AuthProfile | null> {
    const cached = await this.readCache(userId);
    if (cached && cached.user.organizationId === organizationId) {
      return present(cached);
    }

    const profile = await this.loadProfile(userId, organizationId);
    if (profile) {
      await this.writeCache(userId, profile);
    }

    return profile ? present(profile) : null;
  }

  async invalidate(userId: string): Promise<void> {
    await this.redis.del(cacheKey(userId));
  }

  private async loadProfile(userId: string, organizationId: string): Promise<AuthProfile | null> {
    const user = await this.users.findOne(organizationId, { where: { id: userId } });
    const organization = await this.organizations.findOne({ where: { id: organizationId } });
    if (!user || !organization) {
      return null;
    }

    const rows = await this.assignments
      .scopedQueryBuilder(organizationId, 'assignment')
      .innerJoin(Role, 'role', 'role.id = assignment.role_id')
      .innerJoin(RolePermission, 'rolePermission', 'rolePermission.role_id = role.id')
      .innerJoin(Permission, 'permission', 'permission.id = rolePermission.permission_id')
      .andWhere('assignment.userId = :userId', { userId })
      .select([
        'assignment.scopeType AS scope_type',
        'assignment.scopeId AS scope_id',
        'assignment.expiresAt AS expires_at',
        'role.key AS role_key',
        'permission.key AS permission_key',
      ])
      .getRawMany<{
        scope_type: AuthScopeType;
        scope_id: string;
        expires_at: Date | string | null;
        role_key: string;
        permission_key: string;
      }>();

    const grouped = new Map<string, PermissionGrant>();
    for (const row of rows) {
      const mapKey = `${row.role_key}:${row.scope_type}:${row.scope_id}:${expiresKey(row.expires_at)}`;
      const existing = grouped.get(mapKey);
      const permissions = existing?.permissions ?? [];
      if (!permissions.includes(row.permission_key)) {
        permissions.push(row.permission_key);
      }

      grouped.set(mapKey, {
        roleKey: row.role_key,
        permissions,
        scopeType: row.scope_type,
        scopeId: row.scope_id,
        expiresAt: toIso(row.expires_at),
      });
    }

    let grants = [...grouped.values()];
    if (user.isPlatformAdmin) {
      grants = grants
        .map((grant) => ({
          ...grant,
          permissions: grant.permissions.filter((key) => key === PLATFORM_PERMISSION),
        }))
        .filter((grant) => grant.permissions.length > 0);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        organizationId: user.organizationId,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        timezone: organization.timezone,
        plan: organization.plan,
      },
      roles: [],
      permissions: [],
      isPlatformAdmin: user.isPlatformAdmin,
      grants,
    };
  }

  private async readCache(userId: string): Promise<AuthProfile | null> {
    const raw = await this.redis.get(cacheKey(userId));
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthProfile;
    } catch {
      return null;
    }
  }

  private async writeCache(userId: string, profile: AuthProfile): Promise<void> {
    await this.redis.set(cacheKey(userId), JSON.stringify(profile), 'EX', CACHE_TTL_SECONDS);
  }
}

function expiresKey(value: Date | string | null): string {
  if (!value) {
    return '';
  }

  return value instanceof Date ? value.toISOString() : value;
}

function present(profile: AuthProfile): AuthProfile {
  const now = Date.now();
  const active = profile.grants.filter(
    (grant) => !grant.expiresAt || Date.parse(grant.expiresAt) > now,
  );
  return {
    ...profile,
    roles: active.map((grant) => ({
      key: grant.roleKey,
      scopeType: grant.scopeType,
      scopeId: grant.scopeId,
    })),
    permissions: [...new Set(active.flatMap((grant) => grant.permissions))].sort(),
  };
}

function cacheKey(userId: string): string {
  return `auth:ctx:${userId}`;
}

function toIso(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
