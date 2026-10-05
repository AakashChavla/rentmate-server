import { Injectable } from '@nestjs/common';
import { PermissionChecker } from './permission.contract';
import { ROLE, SCOPE } from '../../shared/identity.constants';
import type { PermissionContext } from '../../shared/identity.types';
@Injectable()
export class DefaultPermissionService extends PermissionChecker {
  public override can(
    user: PermissionContext,
    permission: string,
    scope: { propertyId?: string } = {},
  ): boolean {
    if (
      user.isPlatformAdmin &&
      user.roles.some(
        (r) => r.role === ROLE.SUPER_ADMIN && (!r.expiresAt || new Date(r.expiresAt) > new Date()),
      )
    )
      return true;
    return user.roles.some(
      (r) =>
        (!r.expiresAt || new Date(r.expiresAt) > new Date()) &&
        !!r.permissions?.includes(permission) &&
        (r.scope === SCOPE.ORGANIZATION || r.scopeId === scope.propertyId),
    );
  }
}
