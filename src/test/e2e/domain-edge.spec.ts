import { randomUUID, randomBytes } from 'node:crypto';
import { PropertyFixture } from './property-fixture';
import { ORIGIN, type FixtureAccount } from './identity-fixture';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import type { InviteView } from '../../shared/property.types';
const f = new PropertyFixture();
beforeAll(() => f.start());
afterAll(() => f.close());
beforeEach(() => f.resetDomains());
it('rejects empty patches and empty organization timezones and permits clearing an override', async () => {
  const owner = await f.account();
  const property = await f.property(owner, 'PG_HOSTEL');
  for (const path of ['/organization', '/properties/' + property.id])
    await f
      .http()
      .patch('/api/v1' + path)
      .set('Cookie', owner.cookies)
      .set('Origin', ORIGIN)
      .send({})
      .expect(400);
  await f
    .http()
    .patch('/api/v1/organization')
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ timezone: '' })
    .expect(400);
  await f
    .http()
    .patch('/api/v1/properties/' + property.id)
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ timezone: 'Asia/Kolkata' })
    .expect(200);
  const cleared = await f
    .http()
    .patch('/api/v1/properties/' + property.id)
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ timezone: null })
    .expect(200);
  expect((cleared.body as { data: { timezone: unknown } }).data.timezone).toBeNull();
  await f
    .http()
    .patch('/api/v1/properties/' + property.id + '/config')
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ currency: 'INR', rentDueDay: 7, graceDays: 3 })
    .expect(200);
});
it('filters expired invitations and prevents resending one over a newer pending invitation', async () => {
  const owner = await f.account();
  const old = await f.invite(owner);
  await expire(owner, old.record.id);
  const expired = await f
    .http()
    .get('/api/v1/invitations?status=EXPIRED')
    .set('Cookie', owner.cookies)
    .expect(200);
  expect((expired.body as { data: InviteView[] }).data.map((i) => i.id)).toContain(old.record.id);
  await f
    .http()
    .post('/api/v1/invitations')
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ email: old.email, roleKey: 'TENANT', scopeType: 'ORGANIZATION' })
    .expect(201);
  await f
    .http()
    .post('/api/v1/invitations/' + old.record.id + '/resend')
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .expect(409);
});
it('accepts one account when two organizations concurrently invite the same email', async () => {
  const owners = await Promise.all([f.account(), f.account()]);
  const email = 'cross-invite-' + randomUUID() + '@fixture.rentmate.test';
  for (const owner of owners)
    await f
      .http()
      .post('/api/v1/invitations')
      .set('Cookie', owner.cookies)
      .set('Origin', ORIGIN)
      .send({ email, roleKey: 'TENANT', scopeType: 'ORGANIZATION' })
      .expect(201);
  const tokens = f.mail.sent
    .filter((m) => m.recipient === email)
    .map((m) => new URL(m.inviteUrl ?? ORIGIN).searchParams.get('token'));
  expect(tokens).toHaveLength(2);
  const responses = await Promise.all(
    tokens.map((token) =>
      f
        .http()
        .post('/api/v1/invitations/accept')
        .set('Origin', ORIGIN)
        .send({ token, fullName: 'Fixture invite', password: 'FixturePassword123' }),
    ),
  );
  expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
});
it('strictly throttles repeated public acceptance attempts', async () => {
  const token = randomBytes(32).toString('hex');
  for (let index = 0; index < 10; index++)
    await f
      .http()
      .post('/api/v1/invitations/accept')
      .set('Origin', ORIGIN)
      .send({ token, fullName: 'Fixture invite', password: 'FixturePassword123' })
      .expect(400);
  await f
    .http()
    .post('/api/v1/invitations/accept')
    .set('Origin', ORIGIN)
    .send({ token, fullName: 'Fixture invite', password: 'FixturePassword123' })
    .expect(429);
});
it('atomically patches independent configuration fields without resetting existing values', async () => {
  const owner = await f.account();
  const property = await f.property(owner);
  const responses = await Promise.all(
    [{ checkInTime: '16:00' }, { checkOutTime: '10:00' }].map((patch) =>
      f
        .http()
        .patch('/api/v1/properties/' + property.id + '/config')
        .set('Cookie', owner.cookies)
        .set('Origin', ORIGIN)
        .send(patch),
    ),
  );
  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  const result = await f
    .http()
    .get('/api/v1/properties/' + property.id + '/config')
    .set('Cookie', owner.cookies)
    .expect(200);
  expect((result.body as { data: unknown }).data).toEqual({
    currency: 'INR',
    checkInTime: '16:00',
    checkOutTime: '10:00',
  });
});
it('rejects null values for non-nullable organization and property fields', async () => {
  const owner = await f.account();
  const property = await f.property(owner);
  for (const path of ['/organization', '/properties/' + property.id])
    await f
      .http()
      .patch('/api/v1' + path)
      .set('Cookie', owner.cookies)
      .set('Origin', ORIGIN)
      .send({ name: null })
      .expect(400);
  await f
    .http()
    .patch('/api/v1/organization')
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ settings: null })
    .expect(400);
});
async function expire(owner: FixtureAccount, id: string): Promise<void> {
  await f.app
    .get(DatabaseConnection)
    .withManager((m) =>
      m.query(
        "UPDATE organization_invites SET expires_at=now()-interval '1 second' WHERE organization_id=$1 AND id=$2",
        [owner.me.organization.id, id],
      ),
    );
}
