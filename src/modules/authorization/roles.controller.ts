import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { ApiDataResponse } from '../../common/swagger/api-envelope';
import { PERMISSIONS, ROLE_DEFINITIONS, ROLE_PERMISSIONS } from './permission-catalog';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';

class RoleListItemDto {
  key!: string;
  name!: string;
  description!: string;
  permissions!: string[];
}

class PermissionListItemDto {
  key!: string;
  resource!: string;
  action!: string;
  description!: string;
}

@ApiTags('authorization')
@ApiCookieAuth('rm_access')
@Controller()
export class RolesController {
  constructor(
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(Permission) private readonly permissions: Repository<Permission>,
  ) {}

  @Get('roles')
  @ApiDataResponse(RoleListItemDto, 'Lists system roles')
  async listRoles(): Promise<RoleListItemDto[]> {
    const roles = await this.roles.find({ where: { isSystem: true }, order: { key: 'ASC' } });
    const known = new Map(ROLE_DEFINITIONS.map((role) => [role.key, role]));
    return roles.map((role) => ({
      key: role.key,
      name: role.name,
      description: known.get(role.key)?.description ?? role.description,
      permissions: [...(ROLE_PERMISSIONS[role.key] ?? [])].sort(),
    }));
  }

  @Get('permissions')
  @ApiDataResponse(PermissionListItemDto, 'Lists permissions')
  async listPermissions(): Promise<PermissionListItemDto[]> {
    const rows = await this.permissions.find({ order: { key: 'ASC' } });
    if (rows.length > 0) {
      return rows.map((row) => ({
        key: row.key,
        resource: row.resource,
        action: row.action,
        description: row.description,
      }));
    }

    return PERMISSIONS.map((permission) => ({ ...permission }));
  }
}
