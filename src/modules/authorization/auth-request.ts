import type { Request } from 'express';
import type { SessionClaims, PermissionContext } from '../../shared/identity.types';
export interface AuthenticatedRequest extends Request {
  session: SessionClaims;
  authContext: PermissionContext;
}
