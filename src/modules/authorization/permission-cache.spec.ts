import { RedisPermissionContextStore } from './redis-permission-context.store';
import { DefaultPermissionContextLoader } from './default-permission-context-loader.service';
import { UnitIdentityFixture } from '../../test/fakes/identity-fixture';
import { CONSENT } from '../../shared/identity.constants';
it('rejects cache writes started before invalidation and keeps warm contexts free of directory queries', async () => {
  const f = new UnitIdentityFixture();
  const email = 'cache@fixture.rentmate.test';
  const metadata = { ip: 'unit', userAgent: 'fixture' };
  await f.auth.register(
    {
      email,
      password: 'FixturePassword123',
      fullName: 'Fixture',
      organizationName: 'Fixture',
      locale: 'en',
      acceptTerms: true,
      termsVersion: CONSENT.VERSION,
    },
    metadata,
  );
  const me = (await f.auth.verifyRegistration(email, '123456', metadata)).me;
  const cache = new RedisPermissionContextStore(f.store, f.ids);
  const oldVersion = await cache.version(me.organization.id, me.user.id);
  await cache.invalidate(me.organization.id, me.user.id);
  expect(await cache.set(me.organization.id, me.user.id, me, oldVersion)).toBe(false);
  expect(await cache.get(me.organization.id, me.user.id)).toBeNull();
  const loader = new DefaultPermissionContextLoader(cache, f.users, f.organizations, f.roles);
  await loader.load(me.organization.id, me.user.id);
  const query = jest.spyOn(f.users, 'findByIdInOrg');
  await loader.load(me.organization.id, me.user.id);
  expect(query).not.toHaveBeenCalled();
});
