import { SignJWT } from 'jose';
import type { Response, CookieOptions } from 'express';
import { AppConfig } from '../../core/config/app-config.contract';
import { envSchema, type AppEnvironment } from '../../core/config/env.schema';
import { Argon2PasswordHasher } from '../../integrations/password/adapters/argon2/argon2-password-hasher';
import { JoseTokenSigner } from '../../integrations/tokens/adapters/jose/jose-token-signer';
import { AuthCookies } from './auth-cookies';
class FixtureProductionConfig extends AppConfig {
  private readonly values = envSchema.parse({
    NODE_ENV: 'production',
    DB_PASSWORD: 'fixture-only',
    REDIS_URL: 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'a'.repeat(64),
    JWT_REFRESH_SECRET: 'b'.repeat(64),
    OTP_HMAC_SECRET: 'c'.repeat(64),
    COOKIE_DOMAIN: '.fixture.rentmate.test',
  });
  public override get<K extends keyof AppEnvironment>(key: K): AppEnvironment[K] {
    return this.values[key];
  }
}
it('uses full production Argon2id settings and secure strict cookies on all three paths', async () => {
  const config = new FixtureProductionConfig();
  const hash = await new Argon2PasswordHasher(config).hash('FixturePassword123');
  expect(hash).toContain('m=65536');
  expect(hash).toContain('t=3');
  const saved: CookieOptions[] = [];
  const response = {
    cookie(_name: string, _value: string, options: CookieOptions) {
      saved.push(options);
      return this;
    },
  } as unknown as Response;
  new AuthCookies(config).set(response, { access: 'fixture', refresh: 'fixture' });
  expect(saved).toHaveLength(3);
  expect(
    saved.every(
      (options) =>
        options.httpOnly &&
        options.secure &&
        options.sameSite === 'strict' &&
        options.domain === '.fixture.rentmate.test',
    ),
  ).toBe(true);
});
it('rejects wrong issuer and unapproved algorithms even when signed with the fixture key', async () => {
  const config = new FixtureProductionConfig();
  const signer = new JoseTokenSigner(config);
  const key = new TextEncoder().encode(config.get('JWT_ACCESS_SECRET'));
  for (const [algorithm, issuer] of [
    ['HS384', 'rentmate'],
    ['HS256', 'wrong-issuer'],
  ]) {
    const token = await new SignJWT({ sub: 'user', org: 'org', fid: 'family' })
      .setProtectedHeader({ alg: algorithm ?? '' })
      .setIssuer(issuer ?? '')
      .setAudience('rentmate-api')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(key);
    await expect(signer.verify(token, false)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  }
});
