import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PaginatedResult } from '../../common/interceptors/paginated-result';
import { ApiDataResponse } from '../../common/swagger/api-envelope';
import {
  AssignRoleDto,
  ListUsersQueryDto,
  RoleAssignmentDto,
  UpdateUserDto,
  UserViewDto,
} from './dto';
import { UsersService, type UserView } from './users.service';

@ApiTags('users')
@ApiCookieAuth('rm_access')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions('user:read')
  @ApiDataResponse(UserViewDto, 'Lists users in the caller organization')
  list(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ListUsersQueryDto,
  ): Promise<PaginatedResult<UserView[]>> {
    return this.users.list(actor.organizationId, query);
  }

  @Get(':id')
  @RequirePermissions('user:read')
  @ApiDataResponse(UserViewDto, 'Returns one user in the caller organization')
  get(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserView> {
    return this.users.get(actor.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('user:update')
  @ApiDataResponse(UserViewDto, 'Updates a user in the caller organization')
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserDto,
  ): Promise<UserView> {
    return this.users.update(actor, id, body);
  }

  @Post(':id/roles')
  @RequirePermissions('role:assign')
  @ApiDataResponse(RoleAssignmentDto, 'Assigns an organization role')
  assignRole(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AssignRoleDto,
  ) {
    return this.users.assignRole(actor, id, body);
  }

  @Delete(':id/roles/:assignmentId')
  @RequirePermissions('role:assign')
  @ApiDataResponse(RoleAssignmentDto, 'Removes a role assignment')
  removeRole(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ) {
    return this.users.removeRole(actor, id, assignmentId);
  }
}
