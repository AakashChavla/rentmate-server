import { UnitIdentityFixture } from '../../test/fakes/identity-fixture';
import { CONSENT, USER_STATUS } from '../../shared/identity.constants';
import { DefaultRegistrationCleanup } from './default-registration-cleanup.processor';
const input = {
  email: 'owner@unit.rentmate.test',
  fullName: 'Owner',
  password: 'FixturePassword123',
  organizationName: 'Unit organization',
  locale: 'hi' as const,
  acceptTerms: true,
  termsVersion: CONSENT.VERSION,
};
const metadata = { ip: 'unit', userAgent: 'fixture' };
it('registers pending users, owner roles and two consents, then activates a verified account', async () => {
  const f = new UnitIdentityFixture();
  await f.auth.register(input, metadata);
  expect(f.repository.consents).toBe(2);
  expect(f.roles.assignments).toHaveLength(1);
  expect(f.email.sent[0]?.locale).toBe('hi');
  expect(f.repository.identities.get(input.email)?.user.status).toBe(USER_STATUS.PENDING);
  const result = await f.auth.verifyRegistration(input.email, f.email.code(input.email), metadata);
  expect(result.me.user.status).toBe(USER_STATUS.ACTIVE);
  expect(result.me.organization.isActive).toBe(true);
  expect(result.tokens.access).toBeDefined();
});
it('existing emails create nothing and enqueue localized account-exists notification', async () => {
  const f = new UnitIdentityFixture();
  await f.auth.register(input, metadata);
  await f.auth.register(input, metadata);
  expect(f.organizations.organizations.size).toBe(1);
  expect(f.users.users.size).toBe(1);
  expect(f.repository.consents).toBe(2);
  expect(f.email.sent.at(-1)).toMatchObject({ purpose: 'account-exists', locale: 'hi' });
});
it('rejects unaccepted documents, disposable domains and weak passwords', async () => {
  const f = new UnitIdentityFixture();
  await expect(f.auth.register({ ...input, acceptTerms: false }, metadata)).rejects.toMatchObject({
    code: 'VALIDATION_ERROR',
  });
  await expect(
    f.auth.register({ ...input, email: 'person@mailinator.com' }, metadata),
  ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  await expect(f.auth.register({ ...input, password: 'short' }, metadata)).rejects.toMatchObject({
    code: 'WEAK_PASSWORD',
  });
  expect(f.users.users.size).toBe(0);
});
it('uses dummy hashing for unknown users and identical lockout budgets', async () => {
  const f = new UnitIdentityFixture();
  for (let i = 0; i < 4; i++)
    await expect(
      f.auth.login('missing@unit.rentmate.test', 'wrong', metadata),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  await expect(f.auth.login('missing@unit.rentmate.test', 'wrong', metadata)).rejects.toMatchObject(
    { code: 'TOO_MANY_ATTEMPTS', details: { retryAfterSeconds: 900 } },
  );
  expect(f.passwords.dummyCalls).toBe(5);
  await expect(f.auth.login('missing@unit.rentmate.test', 'wrong', metadata)).rejects.toMatchObject(
    { code: 'TOO_MANY_ATTEMPTS' },
  );
  expect(f.passwords.dummyCalls).toBe(5);
});
it('rejects pending and suspended accounts even with a correct password', async () => {
  const f = new UnitIdentityFixture();
  await f.auth.register(input, metadata);
  await expect(f.auth.login(input.email, input.password, metadata)).rejects.toMatchObject({
    code: 'INVALID_CREDENTIALS',
  });
  const user = f.repository.identities.get(input.email)?.user;
  if (!user) throw new Error('Fixture missing');
  user.status = USER_STATUS.SUSPENDED;
  await expect(f.auth.login(input.email, input.password, metadata)).rejects.toMatchObject({
    code: 'ACCOUNT_SUSPENDED',
  });
});
it('cleanup uses the 72-hour cutoff and can run repeatedly', async () => {
  const f = new UnitIdentityFixture();
  const job = new DefaultRegistrationCleanup(f.repository, f.clock);
  await job.handle('registration.cleanup', {});
  expect(f.repository.cleanupBefore?.getTime()).toBe(f.clock.now().getTime() - 72 * 60 * 60 * 1000);
  await job.handle('registration.cleanup', {});
  expect(f.repository.cleanupBefore).toBeDefined();
});
