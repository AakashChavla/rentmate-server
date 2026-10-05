import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiCookieAuth } from '@nestjs/swagger';
import { RequirePermissions } from './permission.decorators';
import { RoleRepository } from './permission.contract';
import { ApiEnvelope } from '../../core/http/api-envelope.decorator';

@ApiTags('roles')
@ApiCookieAuth()
@Controller()
export class RolesController {
  public constructor(@Inject(RoleRepository) private readonly roles: RoleRepository) {}
  @RequirePermissions('role:read')
  @Get('roles')
  @ApiEnvelope(String, undefined, true)
  public listRoles(): Promise<string[]> {
    return this.roles.roles();
  }
  @RequirePermissions('role:read')
  @Get('permissions')
  @ApiEnvelope(String, undefined, true)
  public listPermissions(): Promise<string[]> {
    return this.roles.permissions();
  }
}
