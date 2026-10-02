import type { CookieOptions } from 'express';
import type { CookieConfig } from './cookie-options';
import { buildCookieOptions } from './cookie-options';
import { durationToMs } from './duration';

export const CookieName = {
  Access: 'rm_access',
  Refresh: 'rm_refresh',
  Session: 'rm_session',
} as const;

export const REFRESH_COOKIE_PATH = '/api/v1/auth';

export interface AuthCookie {
  name: string;
  value: string;
  options: CookieOptions;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  accessTtl: string;
  refreshTtl: string;
}

export function buildAuthCookies(config: CookieConfig, tokens: IssuedTokens): AuthCookie[] {
  const accessMaxAge = durationToMs(tokens.accessTtl);
  const refreshMaxAge = durationToMs(tokens.refreshTtl);

  return [
    {
      name: CookieName.Access,
      value: tokens.accessToken,
      options: buildCookieOptions(config, { path: '/', maxAge: accessMaxAge }),
    },
    {
      name: CookieName.Refresh,
      value: tokens.refreshToken,
      options: buildCookieOptions(config, { path: REFRESH_COOKIE_PATH, maxAge: refreshMaxAge }),
    },
    {
      name: CookieName.Session,
      value: '1',
      options: buildCookieOptions(config, { path: '/', maxAge: refreshMaxAge }),
    },
  ];
}

export function buildClearedAuthCookies(config: CookieConfig): AuthCookie[] {
  return buildAuthCookies(config, {
    accessToken: '',
    refreshToken: '',
    accessTtl: '0s',
    refreshTtl: '0s',
  }).map((cookie) => ({
    ...cookie,
    value: '',
    options: { ...cookie.options, maxAge: 0 },
  }));
}

export function readCookie(
  request: { cookies?: Record<string, unknown> },
  name: string,
): string | undefined {
  const value = request.cookies?.[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
