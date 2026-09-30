import {
  buildAuthCookies,
  buildClearedAuthCookies,
  CookieName,
} from '../src/common/utils/auth-cookies';

describe('auth cookies', () => {
  const config = { nodeEnv: 'development', cookieDomain: 'example.test' };

  it('sets access, refresh, and session cookies with the phase 2 paths', () => {
    const cookies = buildAuthCookies(config, {
      accessToken: 'access',
      refreshToken: 'refresh',
      accessTtl: '15m',
      refreshTtl: '7d',
    });

    expect(cookies.map((cookie) => cookie.name)).toEqual([
      CookieName.Access,
      CookieName.Refresh,
      CookieName.Session,
    ]);
    expect(cookies[0]).toMatchObject({
      value: 'access',
      options: {
        httpOnly: true,
        path: '/',
        maxAge: 15 * 60 * 1000,
        sameSite: 'lax',
        secure: false,
      },
    });
    expect(cookies[1]).toMatchObject({
      value: 'refresh',
      options: { httpOnly: true, path: '/api/v1/auth', maxAge: 7 * 24 * 60 * 60 * 1000 },
    });
    expect(cookies[2]).toMatchObject({ value: '1', options: { path: '/', httpOnly: true } });
    expect(cookies[0]?.options.domain).toBe('example.test');
  });

  it('clears every auth cookie', () => {
    const cookies = buildClearedAuthCookies({ nodeEnv: 'production' });

    expect(cookies).toHaveLength(3);
    expect(cookies.every((cookie) => cookie.value === '' && cookie.options.maxAge === 0)).toBe(
      true,
    );
    expect(cookies[0]?.options.sameSite).toBe('strict');
    expect(cookies[0]?.options.secure).toBe(true);
  });
});
