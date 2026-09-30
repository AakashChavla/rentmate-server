import type { CookieOptions } from 'express';

export interface CookieConfig {
  nodeEnv: string;
  cookieDomain?: string;
}

/**
 * Cookie flags for the auth phase. httpOnly is always on.
 * SameSite=Strict and Secure apply in production.
 */
export function buildCookieOptions(
  config: CookieConfig,
  overrides: CookieOptions = {},
): CookieOptions {
  const isProduction = config.nodeEnv === 'production';
  const options: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  };

  if (config.cookieDomain) {
    options.domain = config.cookieDomain;
  }

  return {
    ...options,
    ...overrides,
    httpOnly: true,
  };
}
