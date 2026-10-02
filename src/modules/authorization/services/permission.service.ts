import { Injectable } from '@nestjs/common';
import type {
  AuthenticatedUser,
  AuthScopeType,
  PermissionGrant,
} from '../../../core/http/decorators/current-user.decorator';
import { canAccess, holdsPermission, type ResourceCheck } from './permission-check';
import { PLATFORM_PERMISSION } from '../constants/permission-catalog';
import { PermissionChecker, UserGrant } from '../contracts/permission-checker.contract';
import { PermissionContextStore } from '../stores/permission-context.store';
import { UserRepository } from '../../users/repositories/user.repository';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { UserRoleAssignmentRepository } from '../repositories/user-role-assignment.repository';
import { RolePermissionRepository } from '../repositories/role-permission.repository';
import { UserStatus } from '../../users/types/user-status';

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
export class PermissionService implements PermissionChecker {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly assignmentRepository: UserRoleAssignmentRepository,
    private readonly rolePermissionRepository: RolePermissionRepository,
    private readonly store: PermissionContextStore,
  ) {}

  holds(user: AuthenticatedUser, permission: string): boolean {
    return holdsPermission(user, permission);
  }

  can(user: AuthenticatedUser, permission: string, options?: ResourceCheck): boolean {
    return canAccess(user, permission, options);
  }

  async getUserGrants(userId: string, organizationId?: string): Promise<UserGrant[]> {
    const orgId = organizationId || this.userRepository['getOrgId']();
    const cached = await this.store.get(`${orgId}:${userId}`);
    if (cached) return cached;

    const assignmentRows = await this.assignmentRepository.findGrantsByUserId(orgId, userId);
    const roleIds = [...new Set(assignmentRows.map((r) => r.roleId))];
    const rpRows = await this.rolePermissionRepository.findPermissionsForRoleIds(roleIds);

    const rpMap = new Map<string, string[]>();
    for (const rp of rpRows) {
      const list = rpMap.get(rp.roleId) ?? [];
      list.push(rp.permissionKey);
      rpMap.set(rp.roleId, list);
    }

    const grants: UserGrant[] = assignmentRows.map((row) => ({
      roleKey: row.roleKey,
      scopeType: row.scopeType,
      scopeId: row.scopeId,
      permissions: rpMap.get(row.roleId) ?? [],
      expiresAt: toIso(row.expiresAt),
    }));

    await this.store.set(userId, grants);
    return grants;
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await this.store.invalidate(userId);
  }

  async getProfile(userId: string, organizationId: string): Promise<AuthProfile | null> {
    const profile = await this.loadProfile(userId, organizationId);
    return profile ? present(profile) : null;
  }

  async invalidate(userId: string): Promise<void> {
    await this.store.invalidate(userId);
  }

  private async loadProfile(userId: string, organizationId: string): Promise<AuthProfile | null> {
    const user = await this.userRepository.findByIdInOrg(organizationId, userId);
    const organization = await this.organizationRepository.findById(organizationId);
    if (!user || !organization) {
      return null;
    }

    const assignmentRows = await this.assignmentRepository.findGrantsByUserId(
      organizationId,
      userId,
    );
    const roleIds = [...new Set(assignmentRows.map((r) => r.roleId))];
    const rpRows = await this.rolePermissionRepository.findPermissionsForRoleIds(roleIds);

    const rpMap = new Map<string, string[]>();
    for (const rp of rpRows) {
      const list = rpMap.get(rp.roleId) ?? [];
      list.push(rp.permissionKey);
      rpMap.set(rp.roleId, list);
    }

    let grants: PermissionGrant[] = assignmentRows.map((row) => ({
      roleKey: row.roleKey,
      scopeType: row.scopeType,
      scopeId: row.scopeId,
      permissions: rpMap.get(row.roleId) ?? [],
      expiresAt: toIso(row.expiresAt),
    }));

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

function toIso(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
