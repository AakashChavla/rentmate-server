import { FakePropertyDirectory } from '../../test/fakes/fake-property-directory';
import { UnitIdentityFixture } from '../../test/fakes/identity-fixture';
import { DefaultUsersService } from './default-users.service';
import { PermissionChecker } from '../authorization';
import { CONSENT } from '../../shared/identity.constants';
class AllowedPermissions extends PermissionChecker {
  public override can(): boolean {
    return true;
  }
}
it('rejects last-owner removal, cross-org reads and invalid property scope', async () => {
  const f = new UnitIdentityFixture();
  const input = {
    email: 'owner@unit.rentmate.test',
    fullName: 'Owner',
    password: 'FixturePassword123',
    organizationName: 'Unit organization',
    locale: 'en' as const,
    acceptTerms: true,
    termsVersion: CONSENT.VERSION,
  };
  await f.auth.register(input, { ip: 'unit', userAgent: 'fixture' });
  const me = (
    await f.auth.verifyRegistration(input.email, f.email.code(input.email), {
      ip: 'unit',
      userAgent: 'fixture',
    })
  ).me;
  const service = new DefaultUsersService(
    f.users,
    f.sessions,
    f.roles,
    f.contexts,
    new AllowedPermissions(),
    f.tx,
    f.events,
    new FakePropertyDirectory(),
  );
  await expect(service.get('foreign-org', me.user.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  await expect(
    service.remove(me.organization.id, me.user.id, me.user.id, me.roles[0]?.id ?? ''),
  ).rejects.toMatchObject({ code: 'LAST_OWNER' });
  await expect(
    service.assign(me.organization.id, me.user.id, me.user.id, 'TENANT', 'PROPERTY'),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
});
