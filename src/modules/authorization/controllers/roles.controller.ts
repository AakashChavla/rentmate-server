import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '../../../core/http/swagger/api-envelope';
import { PERMISSIONS, ROLE_DEFINITIONS, ROLE_PERMISSIONS } from '../constants/permission-catalog';
import { RoleRepository } from '../repositories/role.repository';
import { PermissionRepository } from '../repositories/permission.repository';

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
    private readonly roleRepository: RoleRepository,
    private readonly permissionRepository: PermissionRepository,
  ) {}

  @Get('roles')
  @ApiDataResponse(RoleListItemDto, 'Lists system roles')
  async listRoles(): Promise<RoleListItemDto[]> {
    const roles = await this.roleRepository.listRoles();
    const systemRoles = roles.filter((r) => r.isSystem);
    const known = new Map(ROLE_DEFINITIONS.map((role) => [role.key, role]));
    return systemRoles.map((role) => ({
      key: role.key,
      name: role.name,
      description: known.get(role.key)?.description ?? role.description,
      permissions: [...(ROLE_PERMISSIONS[role.key] ?? [])].sort(),
    }));
  }

  @Get('permissions')
  @ApiDataResponse(PermissionListItemDto, 'Lists permissions')
  async listPermissions(): Promise<PermissionListItemDto[]> {
    const rows = await this.permissionRepository.listAllPermissions();
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
