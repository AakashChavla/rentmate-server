import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { TokenService } from '../auth/token.service';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Permission } from './entities/permission.entity';
import { PermissionService } from './permission.service';
import { PermissionsGuard } from './permissions.guard';
import { RolePermission } from './entities/role-permission.entity';
import { Role } from './entities/role.entity';
import { RolesController } from './roles.controller';
import { UserRoleAssignment } from './entities/user-role-assignment.entity';

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
