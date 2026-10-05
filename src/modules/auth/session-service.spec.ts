import { UnitIdentityFixture } from '../../test/fakes/identity-fixture';
import { CONSENT, IDENTITY_TTL } from '../../shared/identity.constants';
const input = {
  email: 'owner@unit.rentmate.test',
  fullName: 'Owner',
  password: 'FixturePassword123',
  organizationName: 'Unit organization',
  locale: 'en' as const,
  acceptTerms: true,
  termsVersion: CONSENT.VERSION,
};
const metadata = { ip: 'unit', userAgent: 'fixture' };
async function signedIn(
  f: UnitIdentityFixture,
): Promise<Awaited<ReturnType<typeof f.auth.verifyRegistration>>> {
  await f.auth.register(input, metadata);
  return f.auth.verifyRegistration(input.email, f.email.code(input.email), metadata);
}
it('rotates atomically, stores only a digest and handles grace without revoking the family', async () => {
  const f = new UnitIdentityFixture();
  const original = await signedIn(f);
  const rotated = await f.sessions.refresh(original.tokens.refresh, metadata);
  expect(rotated.refresh).not.toBe(original.tokens.refresh);
  expect(
    [...f.repository.refreshes.values()].every(
      (r) => r.tokenHash !== original.tokens.refresh && r.tokenHash !== rotated.refresh,
    ),
  ).toBe(true);
  await expect(f.sessions.refresh(original.tokens.refresh, metadata)).rejects.toMatchObject({
    code: 'TOKEN_ROTATED',
  });
  await expect(f.sessions.verify(rotated.access)).resolves.toBeDefined();
});
it('delayed reuse revokes the family and logout immediately rejects earlier access', async () => {
  const f = new UnitIdentityFixture();
  const original = await signedIn(f);
  const rotated = await f.sessions.refresh(original.tokens.refresh, metadata);
  f.clock.advance(IDENTITY_TTL.GRACE + 1);
  await expect(f.sessions.refresh(original.tokens.refresh, metadata)).rejects.toMatchObject({
    code: 'SESSION_REVOKED',
  });
  await expect(f.sessions.verify(rotated.access)).rejects.toMatchObject({
    code: 'SESSION_REVOKED',
  });
});
it('password changes preserve the current family while revoking other sessions', async () => {
  const f = new UnitIdentityFixture();
  const first = await signedIn(f);
  const second = await f.auth.login(input.email, input.password, metadata);
  const claims = await f.tokens.verify(first.tokens.access, false);
  await f.auth.change(claims, input.password, 'ChangedPassword123');
  await expect(f.sessions.verify(first.tokens.access)).resolves.toBeDefined();
  await expect(f.sessions.verify(second.tokens.access)).rejects.toMatchObject({
    code: 'SESSION_REVOKED',
  });
  expect(f.contexts.invalidations).toBeGreaterThan(0);
});
it('reserves OTP attempts before comparison, enforces cooldown and consumes a code once', async () => {
  const f = new UnitIdentityFixture();
  await signedIn(f);
  await f.otp.send(input.email, 'LOGIN');
  await f.otp.send(input.email, 'LOGIN');
  expect(f.email.sent.filter((email) => email.purpose === 'LOGIN')).toHaveLength(1);
  await expect(f.otp.consume(input.email, '000000', 'LOGIN')).rejects.toMatchObject({
    code: 'OTP_INVALID',
  });
  await expect(f.otp.consume(input.email, '000000', 'LOGIN')).rejects.toMatchObject({
    code: 'OTP_INVALID',
  });
  await expect(f.otp.consume(input.email, '000000', 'LOGIN')).rejects.toMatchObject({
    code: 'OTP_INVALID',
  });
  await expect(f.otp.consume(input.email, '123456', 'LOGIN')).rejects.toMatchObject({
    code: 'OTP_LOCKED',
  });
  expect(f.generator.matchesCalls).toBe(4);
});
it('expired OTPs fail and unknown send responses remain neutral', async () => {
  const f = new UnitIdentityFixture();
  await signedIn(f);
  await f.otp.send('missing@unit.rentmate.test', 'LOGIN');
  expect(f.email.sent).toHaveLength(1);
  await f.otp.send(input.email, 'LOGIN');
  f.clock.advance(IDENTITY_TTL.OTP + 1);
  await expect(f.otp.consume(input.email, '123456', 'LOGIN')).rejects.toMatchObject({
    code: 'OTP_EXPIRED',
  });
});
