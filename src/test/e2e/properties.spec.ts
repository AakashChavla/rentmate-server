import type { FixtureAccount } from './identity-fixture';
import { PropertyFixture, PROPERTY_INPUT } from './property-fixture';
import { ORIGIN } from './identity-fixture';
import { PROPERTY_TYPE as T } from '../../shared/property.constants';
import type { PropertyRecord } from '../../shared/property.types';
import type { PermissionContext } from '../../shared/identity.types';
import { EventBus } from '../../core/events/event-bus.contract';
const f = new PropertyFixture();
beforeAll(() => f.start());
afterAll(() => f.close());
beforeEach(() => f.resetDomains());
it('creates, filters, edits, configures, archives and soft deletes properties with onboarding and events', async () => {
  const owner = await f.account();
  const publish = jest.spyOn(f.app.get(EventBus), 'publish');
  const property = await f.property(owner);
  await expectOnboarding(owner);
  await f
    .http()
    .patch('/api/v1/properties/' + property.id)
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ name: 'Edited property' })
    .expect(200);
  const config = await f
    .http()
    .patch('/api/v1/properties/' + property.id + '/config')
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ currency: 'INR', checkInTime: '15:00', checkOutTime: '10:00' })
    .expect(200);
  expect((config.body as { data: { checkInTime: string } }).data.checkInTime).toBe('15:00');
  const list = await f
    .http()
    .get('/api/v1/properties?type=HOTEL&status=ACTIVE&search=Edited')
    .set('Cookie', owner.cookies)
    .expect(200);
  expect((list.body as { data: PropertyRecord[] }).data.map((p) => p.id)).toEqual([property.id]);
  await f
    .http()
    .patch('/api/v1/properties/' + property.id)
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ status: 'ARCHIVED' })
    .expect(200);
  expect(publish.mock.calls.map((call) => call[0])).toEqual(
    expect.arrayContaining(['property.created', 'property.archived']),
  );
  await f
    .http()
    .delete('/api/v1/properties/' + property.id)
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .expect(200);
  await f
    .http()
    .get('/api/v1/properties/' + property.id)
    .set('Cookie', owner.cookies)
    .expect(404);
});
it('proves Org A cannot see or modify Org B through any property endpoint', async () => {
  const a = await f.account();
  const b = await f.account();
  const foreign = await f.property(b);
  for (const suffix of ['', '/config'])
    await f
      .http()
      .get('/api/v1/properties/' + foreign.id + suffix)
      .set('Cookie', a.cookies)
      .expect(404);
  await f
    .http()
    .patch('/api/v1/properties/' + foreign.id)
    .set('Cookie', a.cookies)
    .set('Origin', ORIGIN)
    .send({ name: 'Spoofed' })
    .expect(404);
  await f
    .http()
    .patch('/api/v1/properties/' + foreign.id + '/config')
    .set('Cookie', a.cookies)
    .set('Origin', ORIGIN)
    .send({ currency: 'INR' })
    .expect(404);
  await f
    .http()
    .delete('/api/v1/properties/' + foreign.id)
    .set('Cookie', a.cookies)
    .set('Origin', ORIGIN)
    .expect(404);
  const list = await f
    .http()
    .get('/api/v1/properties?mine=true')
    .set('Cookie', a.cookies)
    .expect(200);
  expect((list.body as { data: PropertyRecord[] }).data).toEqual([]);
  const still = await f
    .http()
    .get('/api/v1/properties/' + foreign.id)
    .set('Cookie', b.cookies)
    .expect(200);
  expect((still.body as { data: PropertyRecord }).data.name).toBe(foreign.name);
});
it('enforces property scope in services rather than allowing a held route permission to expose other properties', async () => {
  const owner = await f.account();
  const own = await f.property(owner);
  const other = await f.property(owner);
  const manager = await f.scoped(owner, own.id);
  const list = await f
    .http()
    .get('/api/v1/properties?mine=true')
    .set('Cookie', manager.cookies)
    .expect(200);
  expect((list.body as { data: PropertyRecord[] }).data.map((p) => p.id)).toEqual([own.id]);
  await f
    .http()
    .get('/api/v1/properties/' + other.id)
    .set('Cookie', manager.cookies)
    .expect(403);
  await f
    .http()
    .get('/api/v1/properties/' + other.id + '/config')
    .set('Cookie', manager.cookies)
    .expect(403);
  await f
    .http()
    .patch('/api/v1/properties/' + other.id)
    .set('Cookie', manager.cookies)
    .set('Origin', ORIGIN)
    .send({ name: 'Other' })
    .expect(403);
  await f
    .http()
    .patch('/api/v1/properties/' + other.id + '/config')
    .set('Cookie', manager.cookies)
    .set('Origin', ORIGIN)
    .send({ currency: 'INR' })
    .expect(403);
  await f
    .http()
    .delete('/api/v1/properties/' + other.id)
    .set('Cookie', manager.cookies)
    .set('Origin', ORIGIN)
    .expect(403);
  await ownPropertyActions(manager, own.id);
});
it('validates configuration for every property type and rejects unknown fields, invalid types and cursors', async () => {
  const owner = await f.account();
  for (const type of Object.values(T)) {
    const property = await f.property(owner, type);
    const invalid =
      type === T.HOTEL
        ? { currency: 'INR', rentDueDay: 1 }
        : { currency: 'INR', checkInTime: '14:00' };
    await f
      .http()
      .patch('/api/v1/properties/' + property.id + '/config')
      .set('Cookie', owner.cookies)
      .set('Origin', ORIGIN)
      .send(invalid)
      .expect(400);
  }
  await f
    .http()
    .post('/api/v1/properties')
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ ...PROPERTY_INPUT, organizationId: owner.me.organization.id })
    .expect(400);
  await f.http().get('/api/v1/properties?cursor=invalid').set('Cookie', owner.cookies).expect(400);
  await f.http().get('/api/v1/properties?type=UNKNOWN').set('Cookie', owner.cookies).expect(400);
  await f
    .http()
    .post('/api/v1/properties')
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ ...PROPERTY_INPUT, timezone: 'Unknown/Zone' })
    .expect(400);
});
it('organization updates stay in the JWT organization and invalidate other cached users', async () => {
  const a = await f.account();
  const b = await f.account();
  const member = await f.member(a);
  await f.http().get('/api/v1/auth/me').set('Cookie', member.cookies).expect(200);
  const own = await f
    .http()
    .get('/api/v1/organization?organizationId=' + b.me.organization.id)
    .set('Cookie', a.cookies)
    .expect(200);
  expect((own.body as { data: { id: string } }).data.id).toBe(a.me.organization.id);
  await f
    .http()
    .patch('/api/v1/organization')
    .set('Cookie', a.cookies)
    .set('Origin', ORIGIN)
    .send({
      name: 'New org',
      timezone: 'Asia/Kolkata',
      defaultLocale: 'hi',
      settings: { contactPhone: '12345' },
    })
    .expect(200);
  const me = await f.http().get('/api/v1/auth/me').set('Cookie', member.cookies).expect(200);
  expect((me.body as { data: PermissionContext }).data.organization.name).toBe('New org');
  const foreign = await f.http().get('/api/v1/organization').set('Cookie', b.cookies).expect(200);
  expect((foreign.body as { data: { name: string } }).data.name).not.toBe('New org');
  await f
    .http()
    .patch('/api/v1/organization')
    .set('Cookie', member.cookies)
    .set('Origin', ORIGIN)
    .send({ name: 'Denied' })
    .expect(403);
});

async function expectOnboarding(owner: FixtureAccount): Promise<void> {
  const me = await f.http().get('/api/v1/auth/me').set('Cookie', owner.cookies).expect(200);
  expect(
    (me.body as { data: PermissionContext }).data.onboarding.steps.find(
      (s) => s.key === 'create_first_property',
    )?.done,
  ).toBe(true);
}

async function ownPropertyActions(manager: FixtureAccount, ownId: string): Promise<void> {
  await f
    .http()
    .post('/api/v1/properties')
    .set('Cookie', manager.cookies)
    .set('Origin', ORIGIN)
    .send(PROPERTY_INPUT)
    .expect(403);
  await f
    .http()
    .patch('/api/v1/properties/' + ownId)
    .set('Cookie', manager.cookies)
    .set('Origin', ORIGIN)
    .send({ name: 'My house' })
    .expect(200);
}
