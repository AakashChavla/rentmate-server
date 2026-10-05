import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Req,
  Param,
  Inject,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiCookieAuth } from '@nestjs/swagger';
import { UsersService } from './users.contract';
import { AnyAuthenticated, RequirePermissions, type AuthenticatedRequest } from '../authorization';
import { ValidatedBody, ValidatedQuery } from '../../core/http/validated-input.decorator';
import { ApiEnvelope } from '../../core/http/api-envelope.decorator';
import { UserDto, NeutralDto } from '../auth';
import { ProfileDto, UpdateUserDto, AssignRoleDto, UserListDto } from './users.dto';
import type { IdentityUser } from '../../shared/identity.types';
import { IDENTITY_LIMITS as L } from '../../shared/identity.constants';
@ApiTags('users')
@ApiCookieAuth()
@Controller('users')
export class UsersController {
  public constructor(@Inject(UsersService) private readonly users: UsersService) {}
  @AnyAuthenticated()
  @Patch('me')
  @ApiEnvelope(UserDto)
  public profile(
    @Req() request: AuthenticatedRequest,
    @ValidatedBody(ProfileDto) body: ProfileDto,
  ): Promise<IdentityUser> {
    return this.users.profile(request.session.org, request.session.sub, body);
  }
  @RequirePermissions('user:read')
  @Get()
  @ApiEnvelope(UserDto, undefined, true)
  public async list(
    @Req() request: AuthenticatedRequest,
    @ValidatedQuery(UserListDto) query: UserListDto,
  ): Promise<{
    items: IdentityUser[];
    page: { limit: number; hasNext: boolean; nextCursor: string | null };
  }> {
    const result = await this.users.list(
      request.session.org,
      query.cursor,
      query.status,
      query.search,
    );
    return {
      items: result.items,
      page: { limit: L.PAGE_SIZE, hasNext: !!result.nextCursor, nextCursor: result.nextCursor },
    };
  }
  @RequirePermissions('user:read')
  @Get(':id')
  @ApiEnvelope(UserDto)
  public get(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IdentityUser> {
    return this.users.get(request.session.org, id);
  }
  @RequirePermissions('user:update')
  @Patch(':id')
  @ApiEnvelope(UserDto)
  public update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @ValidatedBody(UpdateUserDto) body: UpdateUserDto,
  ): Promise<IdentityUser> {
    return this.users.update(request.session.org, request.session.sub, id, body);
  }
  @RequirePermissions('role:assign')
  @Post(':id/roles')
  @ApiEnvelope(NeutralDto, HttpStatus.CREATED)
  public async assign(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @ValidatedBody(AssignRoleDto) body: AssignRoleDto,
  ): Promise<{ accepted: boolean }> {
    await this.users.assign(
      request.session.org,
      request.session.sub,
      id,
      body.role,
      body.scope,
      body.scopeId,
    );
    return { accepted: true };
  }
  @RequirePermissions('role:assign')
  @Delete(':id/roles/:assignmentId')
  @ApiEnvelope(NeutralDto)
  public async remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ): Promise<{ accepted: boolean }> {
    await this.users.remove(request.session.org, request.session.sub, id, assignmentId);
    return { accepted: true };
  }
}
