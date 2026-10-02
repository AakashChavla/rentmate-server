import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantScopedRepository } from '../../../core/database/base/tenant-scoped.repository';
import { UserRoleAssignment } from '../entities/user-role-assignment.entity';
import { Role } from '../entities/role.entity';
import { ScopeType } from '../types/scope-type';

export interface UserRoleAssignmentRow {
  userId: string;
  roleId: string;
  roleKey: string;
  scopeType: ScopeType;
  scopeId: string;
  expiresAt: Date | string | null;
}

@Injectable()
export class UserRoleAssignmentRepository extends TenantScopedRepository<UserRoleAssignment> {
  constructor(dataSource: DataSource) {
    super(UserRoleAssignment, dataSource);
  }

  async findAssignmentsForUsers(
    organizationId: string,
    userIds: string[],
  ): Promise<UserRoleAssignmentRow[]> {
    if (userIds.length === 0) return [];
    const orgId = this.getOrgId(organizationId);

    const rows = await this.repo
      .createQueryBuilder('assignment')
      .innerJoin(Role, 'role', 'role.id = assignment.role_id')
      .where('assignment.organization_id = :orgId', { orgId })
      .andWhere('assignment.user_id IN (:...userIds)', { userIds })
      .andWhere('assignment.deleted_at IS NULL')
      .select([
        'assignment.user_id AS user_id',
        'assignment.role_id AS role_id',
        'assignment.scope_type AS scope_type',
        'assignment.scope_id AS scope_id',
        'assignment.expires_at AS expires_at',
        'role.key AS role_key',
      ])
      .getRawMany<{
        user_id: string;
        role_id: string;
        scope_type: ScopeType;
        scope_id: string;
        expires_at: Date | string | null;
        role_key: string;
      }>();

    return rows.map((r) => ({
      userId: r.user_id,
      roleId: r.role_id,
      scopeType: r.scope_type,
      scopeId: r.scope_id,
      expiresAt: r.expires_at,
      roleKey: r.role_key,
    }));
  }

  async findAssignmentById(
    organizationId: string,
    userId: string,
    assignmentId: string,
  ): Promise<UserRoleAssignment | null> {
    const orgId = this.getOrgId(organizationId);
    return this.repo.findOne({
      where: { id: assignmentId, userId, organizationId: orgId },
    });
  }

  async countActiveOwners(organizationId: string, orgOwnerRoleId: string): Promise<number> {
    const orgId = this.getOrgId(organizationId);
    const rows = await this.repo.find({
      where: {
        organizationId: orgId,
        roleId: orgOwnerRoleId,
        scopeType: ScopeType.Organization,
        scopeId: orgId,
      },
    });

    const now = Date.now();
    return rows.filter((r) => !r.expiresAt || r.expiresAt.getTime() > now).length;
  }

  async saveAssignment(
    organizationId: string,
    data: Partial<UserRoleAssignment>,
  ): Promise<UserRoleAssignment> {
    const orgId = this.getOrgId(organizationId);
    const entity = this.repo.create({ ...data, organizationId: orgId });
    return this.repo.save(entity);
  }

  async softDeleteAssignment(organizationId: string, assignmentId: string): Promise<void> {
    const orgId = this.getOrgId(organizationId);
    await this.repo.softDelete({ id: assignmentId, organizationId: orgId });
  }

  async findGrantsByUserId(userId: string): Promise<UserRoleAssignmentRow[]> {
    const rows = await this.repo
      .createQueryBuilder('assignment')
      .innerJoin(Role, 'role', 'role.id = assignment.role_id')
      .where('assignment.user_id = :userId', { userId })
      .andWhere('assignment.deleted_at IS NULL')
      .select([
        'assignment.user_id AS user_id',
        'assignment.scope_type AS scope_type',
        'assignment.scope_id AS scope_id',
        'assignment.expires_at AS expires_at',
        'role.id AS role_id',
        'role.key AS role_key',
      ])
      .getRawMany<{
        user_id: string;
        scope_type: ScopeType;
        scope_id: string;
        expires_at: Date | string | null;
        role_id: string;
        role_key: string;
      }>();

    return rows.map((r) => ({
      userId: r.user_id,
      scopeType: r.scope_type,
      scopeId: r.scope_id,
      expiresAt: r.expires_at,
      roleKey: r.role_key,
      roleId: r.role_id,
    }));
  }
}
