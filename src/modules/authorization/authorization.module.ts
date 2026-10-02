import { APP_GUARD } from '@nestjs/core';
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserRoleAssignment } from './entities/user-role-assignment.entity';
import { RolesController } from './controllers/roles.controller';
import { PermissionService } from './services/permission.service';
import { PermissionChecker } from './contracts/permission-checker.contract';
import { PermissionContextStore } from './stores/permission-context.store';
import { UserRoleAssignmentRepository } from './repositories/user-role-assignment.repository';
import { RoleRepository } from './repositories/role.repository';
import { PermissionRepository } from './repositories/permission.repository';
import { RolePermissionRepository } from './repositories/role-permission.repository';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { UserRepository } from '../users/repositories/user.repository';
import { OrganizationRepository } from '../organizations/repositories/organization.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, Permission, RolePermission, UserRoleAssignment]),
    forwardRef(() => AuthModule),
  ],
  controllers: [RolesController],
  providers: [
    UserRepository,
    OrganizationRepository,
    UserRoleAssignmentRepository,
    RoleRepository,
    PermissionRepository,
    RolePermissionRepository,
    PermissionContextStore,
    PermissionService,
    {
      provide: PermissionChecker,
      useExisting: PermissionService,
    },
    JwtAuthGuard,
    PermissionsGuard,
    {
      provide: APP_GUARD,
      useExisting: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useExisting: PermissionsGuard,
    },
  ],
  exports: [
    PermissionChecker,
    PermissionService,
    JwtAuthGuard,
    PermissionsGuard,
    UserRoleAssignmentRepository,
    RoleRepository,
    PermissionRepository,
    RolePermissionRepository,
  ],
})
export class AuthorizationModule {}
