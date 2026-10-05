import { Inject, Injectable } from '@nestjs/common';
import type { Response, CookieOptions } from 'express';
import { AppConfig } from '../../core/config/app-config.contract';
import { COOKIE_NAMES, ENVIRONMENT } from '../../core/config/config.constants';
import { AUTH_PATH, IDENTITY_TTL as T } from '../../shared/identity.constants';
import type { SessionTokens } from '../../shared/identity.types';
@Injectable()
export class AuthCookies {
  public constructor(@Inject(AppConfig) private readonly config: AppConfig) {}
  private options(path: string, maxAge: number): CookieOptions {
    const production = this.config.get('NODE_ENV') === ENVIRONMENT.PRODUCTION;
    const domain = this.config.get('COOKIE_DOMAIN');
    return {
      path,
      maxAge,
      httpOnly: true,
      secure: production,
      sameSite: production ? 'strict' : 'lax',
      ...(domain ? { domain } : {}),
    };
  }
  public set(response: Response, tokens: SessionTokens): void {
    response.cookie(COOKIE_NAMES.ACCESS, tokens.access, this.options('/', T.ACCESS));
    response.cookie(COOKIE_NAMES.REFRESH, tokens.refresh, this.options(AUTH_PATH, T.REFRESH));
    response.cookie(COOKIE_NAMES.SESSION, 'present', this.options('/', T.REFRESH));
  }
  public clear(response: Response): void {
    for (const [name, path] of [
      [COOKIE_NAMES.ACCESS, '/'],
      [COOKIE_NAMES.REFRESH, AUTH_PATH],
      [COOKIE_NAMES.SESSION, '/'],
    ] as const)
      response.clearCookie(name, this.options(path, 0));
  }
}
