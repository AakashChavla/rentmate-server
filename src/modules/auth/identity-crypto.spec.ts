import { Argon2PasswordHasher } from '../../integrations/password/adapters/argon2/argon2-password-hasher';
import { JoseTokenSigner } from '../../integrations/tokens/adapters/jose/jose-token-signer';
import { CryptoOtpGenerator } from '../../integrations/otp/adapters/crypto/crypto-otp-generator';
import { AppConfigService } from '../../core/config/default-app-config.service';
import { envSchema } from '../../core/config/env.schema';
import { AuthCookies } from './auth-cookies';
import type { Response, CookieOptions } from 'express';
it('uses Argon2id, verifies passwords and rejects wrong passwords', async () => {
  const hasher = new Argon2PasswordHasher(new AppConfigService());
  const hash = await hasher.hash('FixturePassword123');
  expect(hash).toMatch(/^\$argon2id\$/);
  expect(hash).toContain('m=4096');
  expect(hash).toContain('t=1');
  expect(hash).toContain('p=1');
  expect(await hasher.verify(hash, 'FixturePassword123')).toBe(true);
  expect(await hasher.verify(hash, 'different')).toBe(false);
  await hasher.dummyVerify('unknown');
});
it('pins access and refresh audiences and rejects changed signatures', async () => {
  const signer = new JoseTokenSigner(new AppConfigService());
  const claims = { sub: 'user', org: 'organization', fid: 'family' };
  const access = await signer.sign(claims, false);
  const refresh = await signer.sign({ ...claims, jti: 'id' }, true);
  expect(await signer.verify(access, false)).toMatchObject(claims);
  expect(await signer.verify(refresh, true)).toMatchObject({ jti: 'id' });
  await expect(signer.verify(access, true)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  await expect(signer.verify(refresh, false)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  const parts = access.split('.');
  await expect(
    signer.verify(`${parts[0] ?? ''}.${parts[1] ?? ''}.bad`, false),
  ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
});
it('uses cryptographic six-digit OTPs and context-bound HMAC digests', () => {
  const generator = new CryptoOtpGenerator(new AppConfigService());
  const code = generator.generate();
  expect(code).toMatch(/^\d{6}$/);
  const digest = generator.digest(code, 'purpose:user:id');
  expect(digest).toHaveLength(64);
  expect(digest).not.toBe(code);
  expect(generator.matches(code, 'purpose:user:id', digest)).toBe(true);
  expect(generator.matches(code, 'other:user:id', digest)).toBe(false);
  expect(generator.matches(code, 'purpose:user:id', '')).toBe(false);
});
it('sets consistent paths, httpOnly hint and matching cookie lifetimes, then clears them', () => {
  const saved: { name: string; value: string; options: CookieOptions }[] = [];
  const cleared: string[] = [];
  const response = {
    cookie(name: string, value: string, options: CookieOptions) {
      saved.push({ name, value, options });
      return this;
    },
    clearCookie(name: string) {
      cleared.push(name);
      return this;
    },
  } as unknown as Response;
  const helper = new AuthCookies(new AppConfigService());
  helper.set(response, { access: 'fixture-access', refresh: 'fixture-refresh' });
  expect(saved.map((item) => item.name)).toEqual(['rm_access', 'rm_refresh', 'rm_session']);
  expect(saved.every((item) => item.options.httpOnly && item.options.sameSite === 'lax')).toBe(
    true,
  );
  expect(saved[1]?.options.path).toBe('/api/v1/auth');
  expect(saved[2]?.value).toBe('present');
  expect(saved[2]?.options.maxAge).toBe(saved[1]?.options.maxAge);
  helper.clear(response);
  expect(cleared).toEqual(['rm_access', 'rm_refresh', 'rm_session']);
});
it('rejects short and placeholder secrets', () => {
  const base = {
    DB_PASSWORD: 'fixture-only',
    REDIS_URL: 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'a'.repeat(64),
    JWT_REFRESH_SECRET: 'b'.repeat(64),
    OTP_HMAC_SECRET: 'c'.repeat(64),
  };
  expect(envSchema.safeParse({ ...base, JWT_ACCESS_SECRET: 'short' }).success).toBe(false);
  expect(envSchema.safeParse({ ...base, OTP_HMAC_SECRET: 'replace-me-'.repeat(8) }).success).toBe(
    false,
  );
});
