import { SetMetadata } from '@nestjs/common';

export const ALLOW_REFRESH_KEY = 'allowRefreshSession';

/**
 * Accepts a valid refresh cookie when the access cookie is missing or expired.
 * Used by logout, which must still run after the access token expires.
 */
export const AllowRefreshSession = () => SetMetadata(ALLOW_REFRESH_KEY, true);
