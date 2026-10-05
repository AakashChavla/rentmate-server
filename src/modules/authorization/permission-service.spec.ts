import { DefaultPermissionService } from './default-permission.service';
import { UnitIdentityFixture } from '../../test/fakes/identity-fixture';
import { CONSENT, SCOPE } from '../../shared/identity.constants';
const input = {
  email: 'owner@unit.rentmate.test',
  fullName: 'Owner',
  password: 'FixturePassword123',
  organizationName: 'Unit organization',
  locale: 'en' as const,
  acceptTerms: true,
  termsVersion: CONSENT.VERSION,
};
it('permission checks respect role grants, expiration and property scope', async () => {
  const f = new UnitIdentityFixture();
  await f.auth.register(input, { ip: 'unit', userAgent: 'fixture' });
  const me = (
    await f.auth.verifyRegistration(input.email, f.email.code(input.email), {
      ip: 'unit',
      userAgent: 'fixture',
    })
  ).me;
  const checker = new DefaultPermissionService();
  expect(checker.can(me, 'user:read')).toBe(true);
  expect(checker.can(me, 'platform:read')).toBe(false);
  const role = me.roles[0];
  if (!role) throw new Error('Fixture role missing');
  role.scope = SCOPE.PROPERTY;
  role.scopeId = 'property-a';
  expect(checker.can(me, 'user:read')).toBe(false);
  expect(checker.can(me, 'user:read', { propertyId: 'property-a' })).toBe(true);
  expect(checker.can(me, 'user:read', { propertyId: 'property-b' })).toBe(false);
  role.expiresAt = new Date(0);
  expect(checker.can(me, 'user:read', { propertyId: 'property-a' })).toBe(false);
});
