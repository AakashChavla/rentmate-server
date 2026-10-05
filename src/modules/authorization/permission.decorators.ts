import { SetMetadata } from '@nestjs/common';
export const AUTHENTICATED_METADATA = 'identity:authenticated';
export const PERMISSIONS_METADATA = 'identity:permissions';
export const AnyAuthenticated = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(AUTHENTICATED_METADATA, true);
export const RequirePermissions = (...permissions: string[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(PERMISSIONS_METADATA, permissions);
