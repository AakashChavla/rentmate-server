import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export type AuthScopeType = 'ORGANIZATION' | 'PROPERTY';

export type AccountStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED';

/**
 * A permission grant copied from the verified session.
 * `permissions` is the role's keys. Scope comes from the assignment.
 */
export interface PermissionGrant {
  roleKey: string;
  permissions: string[];
  scopeType: AuthScopeType;
  scopeId: string;
  expiresAt: string | null;
}

/**
 * Identity attached by the JWT guard. The organization id comes from the
 * verified access token, not from route params or the body.
 */
export interface AuthenticatedUser {
  id: string;
  organizationId: string;
  sessionId: string;
  status: AccountStatus;
  isPlatformAdmin: boolean;
  grants: PermissionGrant[];
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user || !data) {
      return user;
    }

    return user[data];
  },
);
