import { FakePropertyDirectory } from '../../test/fakes/fake-property-directory';
import { RedisPermissionContextStore } from './redis-permission-context.store';
import { DefaultPermissionContextLoader } from './default-permission-context-loader.service';
import { UnitIdentityFixture } from '../../test/fakes/identity-fixture';
import { CONSENT } from '../../shared/identity.constants';
import type { PermissionContext } from '../../shared/identity.types';
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
  const loader = new DefaultPermissionContextLoader(
    cache,
    f.users,
    f.organizations,
    f.roles,
    new FakePropertyDirectory(),
  );
  await loader.load(me.organization.id, me.user.id);
  const query = jest.spyOn(f.users, 'findByIdInOrg');
  await loader.load(me.organization.id, me.user.id);
  expect(query).not.toHaveBeenCalled();
});
it('invalidates every cached member and rejects both stale organization-version writes', async () => {
  const f = new UnitIdentityFixture();
  const me = await context(f);
  const cache = new RedisPermissionContextStore(f.store, f.ids);
  const org = me.organization.id;
  const first = me.user.id;
  const second = f.ids.next();
  const firstVersion = await cache.version(org, first);
  const secondVersion = await cache.version(org, second);
  await cache.set(org, first, me, firstVersion);
  await cache.set(org, second, { ...me, user: { ...me.user, id: second } }, secondVersion);
  await cache.invalidateOrganization(org);
  expect(await cache.get(org, first)).toBeNull();
  expect(await cache.get(org, second)).toBeNull();
  expect(await cache.set(org, first, me, firstVersion)).toBe(false);
  expect(await cache.set(org, second, me, secondVersion)).toBe(false);
  expect(await cache.set(org, first, me, await cache.version(org, first))).toBe(true);
});
async function context(f: UnitIdentityFixture): Promise<PermissionContext> {
  const email = 'organization-cache@fixture.rentmate.test';
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
  return (await f.auth.verifyRegistration(email, '123456', metadata)).me;
}
