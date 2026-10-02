export { AuthorizationModule } from './authorization.module';
export { PermissionChecker, type UserGrant } from './contracts/permission-checker.contract';
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { PermissionsGuard } from './guards/permissions.guard';
export { ScopeType } from './types/scope-type';
export { RoleKey } from './entities/role.entity';
export { PERMISSIONS, ROLE_PERMISSIONS, ROLE_DEFINITIONS } from './constants/permission-catalog';
