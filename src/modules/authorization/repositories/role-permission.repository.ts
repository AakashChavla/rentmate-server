import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GlobalRepository } from '../../../core/database/base/global.repository';
import { RolePermission } from '../entities/role-permission.entity';
import { Permission } from '../entities/permission.entity';

export interface RolePermissionRow {
  roleId: string;
  permissionKey: string;
}

@Injectable()
export class RolePermissionRepository extends GlobalRepository<RolePermission> {
  constructor(dataSource: DataSource) {
    super(RolePermission, dataSource);
  }

  async findPermissionsForRoleIds(roleIds: string[]): Promise<RolePermissionRow[]> {
    if (roleIds.length === 0) return [];

    const rows = await this.repo
      .createQueryBuilder('rp')
      .innerJoin(Permission, 'p', 'p.id = rp.permission_id')
      .where('rp.role_id IN (:...roleIds)', { roleIds })
      .select(['rp.role_id AS role_id', 'p.key AS permission_key'])
      .getRawMany<{ role_id: string; permission_key: string }>();

    return rows.map((r) => ({
      roleId: r.role_id,
      permissionKey: r.permission_key,
    }));
  }
}
