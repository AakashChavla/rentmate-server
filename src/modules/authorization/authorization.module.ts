import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from '../auth/refresh-token.entity';
import { TokenService } from '../auth/token.service';
import { Organization } from '../organizations/organization.entity';
import { User } from '../users/user.entity';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Permission } from './permission.entity';
import { PermissionService } from './permission.service';
import { PermissionsGuard } from './permissions.guard';
import { RolePermission } from './role-permission.entity';
import { Role } from './role.entity';
import { RolesController } from './roles.controller';
import { UserRoleAssignment } from './user-role-assignment.entity';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([
      Role,
      Permission,
      RolePermission,
      UserRoleAssignment,
      User,
      Organization,
      RefreshToken,
    ]),
  ],
  controllers: [RolesController],
  providers: [
    PermissionService,
    TokenService,
    JwtAuthGuard,
    PermissionsGuard,
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: PermissionsGuard },
  ],
  exports: [PermissionService, TypeOrmModule],
})
export class AuthorizationModule {}
