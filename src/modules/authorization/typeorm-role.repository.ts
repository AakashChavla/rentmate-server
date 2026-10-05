import { Injectable, Inject } from '@nestjs/common';
import { In } from 'typeorm';
import type { RoleAssignment } from '../../shared/identity.types';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import { RoleRepository } from './permission.contract';
import { UserRoleAssignmentEntity } from './user-role-assignment.entity';
import { RoleEntity } from './role.entity';
import { PermissionEntity } from './permission.entity';
import { ROLE, SCOPE, USER_STATUS } from '../../shared/identity.constants';
@Injectable()
export class TypeOrmRoleRepository extends RoleRepository {
  public constructor(@Inject(DatabaseConnection) private readonly db: DatabaseConnection) {
    super();
  }
  public override async context(
    organizationId: string,
    userId: string,
  ): ReturnType<RoleRepository['context']> {
    return this.db.withManager(async (m) => {
      const roles = await m
        .getRepository(UserRoleAssignmentEntity)
        .createQueryBuilder('a')
        .where('a.organization_id=:organizationId AND a.user_id=:userId', {
          organizationId,
          userId,
        })
        .andWhere('(a.expires_at IS NULL OR a.expires_at>now())')
        .getMany();
      const grants = await m.query<{ role: string; permission: string }[]>(
        'SELECT DISTINCT rp.role,rp.permission FROM role_permissions rp JOIN user_role_assignments a ON a.role=rp.role WHERE a.organization_id=$1 AND a.user_id=$2 AND a.deleted_at IS NULL AND (a.expires_at IS NULL OR a.expires_at>now())',
        [organizationId, userId],
      );
      return {
        roles: roles.map((role) => ({
          id: role.id,
          userId: role.userId,
          organizationId: role.organizationId,
          role: role.role,
          scope: role.scope,
          scopeId: role.scopeId,
          expiresAt: role.expiresAt,
          permissions: grants.filter((g) => g.role === role.role).map((g) => g.permission),
        })),
        permissions: [...new Set(grants.map((g) => g.permission))],
      };
    });
  }
  public override forUsers(organizationId: string, users: string[]): Promise<RoleAssignment[]> {
    return this.db.withManager((m) =>
      m.getRepository(UserRoleAssignmentEntity).findBy({ organizationId, userId: In(users) }),
    );
  }
  public override async assign(
    organizationId: string,
    userId: string,
    role: string,
    scope: string = SCOPE.ORGANIZATION,
    scopeId: string = organizationId,
  ): Promise<void> {
    await this.db.withManager((m) =>
      m
        .getRepository(UserRoleAssignmentEntity)
        .createQueryBuilder()
        .insert()
        .values({
          organizationId,
          userId,
          role,
          scope: scope as typeof SCOPE.ORGANIZATION,
          scopeId,
          propertyId: scope === SCOPE.PROPERTY ? scopeId : null,
        })
        .orIgnore()
        .execute(),
    );
  }
  public override async remove(organizationId: string, userId: string, id: string): Promise<void> {
    await this.db.withManager((m) =>
      m.getRepository(UserRoleAssignmentEntity).delete({ organizationId, userId, id }),
    );
  }
  public override async lockOwners(org: string): Promise<string[]> {
    return this.db.withManager(async (m) => {
      await m.query('SELECT id FROM organizations WHERE id=$1 FOR UPDATE', [org]);
      const rows = await m.query<{ user_id: string }[]>(
        'SELECT a.user_id FROM user_role_assignments a JOIN users u ON u.id=a.user_id AND u.organization_id=a.organization_id WHERE a.organization_id=$1 AND a.role=$2 AND a.scope=$3 AND a.deleted_at IS NULL AND u.deleted_at IS NULL AND u.status=$4 AND (a.expires_at IS NULL OR a.expires_at>now()) FOR UPDATE OF a',
        [org, ROLE.OWNER, SCOPE.ORGANIZATION, USER_STATUS.ACTIVE],
      );
      return rows.map((row) => row.user_id);
    });
  }
  public override async roles(): Promise<string[]> {
    return this.db.withManager(async (m) =>
      (await m.getRepository(RoleEntity).find()).map((r) => r.name),
    );
  }
  public override async permissions(): Promise<string[]> {
    return this.db.withManager(async (m) =>
      (await m.getRepository(PermissionEntity).find()).map((p) => p.name),
    );
  }
}
