import { LeaseFixture, data } from './lease-fixture';
import { ORIGIN, FIXTURE_PASSWORD, type FixtureAccount } from './identity-fixture';
import { TenantRepository } from '../../modules/tenants';
import { LeaseRepository } from '../../modules/leases';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import type { TenantView, LeaseView } from '../../shared/lease.types';
import type { BedRecord, OccupancySnapshot } from '../../shared/unit.types';
const f = new LeaseFixture();
let owner: FixtureAccount, foreign: FixtureAccount;
beforeAll(async () => {
  await f.start();
  owner = await f.account();
  foreign = await f.account();
});
afterAll(() => f.close());
beforeEach(() => f.resetDomains());
it('proves organization isolation for tenant, document and lease endpoints', async () => {
  const p = await f.property(owner),
    t = await f.tenant(owner, p.id),
    u = await f.room(owner, p.id);
  const doc = await f.upload(owner, t.id);
  await f.post(owner, 'documents/' + doc.id + '/review', { status: 'VERIFIED' }).expect(201);
  await f.post(owner, 'tenants/' + t.id + '/review', { status: 'VERIFIED' }).expect(201);
  const lease = await f.lease(owner, f.input(t.id, u.id));
  for (const url of [
    'tenants/' + t.id,
    'tenants/' + t.id + '/documents',
    'documents/' + doc.id + '/download',
    'leases/' + lease.id,
  ])
    await f.get(foreign, url).expect(404);
  for (const [url, input] of [
    ['tenants/' + t.id + '/review', { status: 'VERIFIED' }],
    ['tenants/' + t.id + '/invite', {}],
    ['documents/' + doc.id + '/review', { status: 'REJECTED', reason: 'Invalid' }],
    ['leases/' + lease.id + '/deposit', { reference: 'foreign' }],
    ['leases/' + lease.id + '/terminate', { reason: 'foreign' }],
    ['leases/' + lease.id + '/renew', f.input(t.id, u.id)],
  ] as const)
    await f.post(foreign, url, input).expect(404);
  await f.post(foreign, 'leases', f.input(t.id, u.id)).expect(404);
  await f
    .post(foreign, 'tenants', {
      propertyId: p.id,
      fullName: 'Foreign',
      phone: '123',
      email: 'foreign@fixture.test',
    })
    .expect(404);
  expect(data<TenantView[]>(await f.get(foreign, 'tenants'))).toEqual([]);
  expect(data<LeaseView[]>(await f.get(foreign, 'leases'))).toEqual([]);
});
it('links a Phase 3 TENANT invitation and restricts the portal to its own records', async () => {
  const p = await f.property(owner),
    t = await f.tenant(owner, p.id),
    other = await f.tenant(owner, p.id),
    u = await f.room(owner, p.id);
  await f.verify(owner, t);
  await f.verify(owner, other);
  const lease = await f.lease(owner, f.input(t.id, u.id));
  const docs = await f.app.get(TenantRepository).get(owner.me.organization.id, t.id);
  expect(docs?.userId).toBeNull();
  await f.post(owner, 'tenants/' + t.id + '/invite', {}).expect(201);
  const sent = f.mail.sent.find((m) => m.recipient === t.email && m.inviteUrl);
  const token = sent?.inviteUrl ? new URL(sent.inviteUrl).searchParams.get('token') : null;
  expect(token).toBeTruthy();
  await f
    .http()
    .post('/api/v1/invitations/accept')
    .set('Origin', ORIGIN)
    .send({ token, fullName: t.fullName, password: FIXTURE_PASSWORD })
    .expect(200);
  const login = await f
    .http()
    .post('/api/v1/auth/login')
    .set('Origin', ORIGIN)
    .send({ email: t.email, password: FIXTURE_PASSWORD })
    .expect(200);
  const cookies = (login.headers['set-cookie'] as unknown as string[]).map(
    (v) => v.split(';')[0] ?? '',
  );
  const portal = { ...owner, cookies };
  expect(data<TenantView[]>(await f.get(portal, 'tenants')).map((r) => r.id)).toEqual([t.id]);
  await f.get(portal, 'tenants/' + other.id).expect(404);
  await f.get(portal, 'leases/' + lease.id).expect(200);
  await f.post(portal, 'leases/' + lease.id + '/deposit', { reference: 'no' }).expect(403);
  await f.post(portal, 'tenants/' + t.id + '/review', { status: 'VERIFIED' }).expect(403);
  expect(
    (await f.app.get(TenantRepository).get(owner.me.organization.id, t.id))?.userId,
  ).not.toBeNull();
});
it('database serialization prevents whole-room versus bed races and preserves PG occupancy', async () => {
  const p = await f.property(owner, 'PG_HOSTEL'),
    t = await f.tenant(owner, p.id),
    u = await f.room(owner, p.id);
  await f.verify(owner, t);
  const bed = data<BedRecord>(
    await f.post(owner, 'units/' + u.id + '/beds', { label: 'A' }).expect(201),
  );
  const org = owner.me.organization.id,
    repo = f.app.get(LeaseRepository),
    tx = f.app.get(TransactionRunner);
  const results = await Promise.allSettled([
    tx.run(() => repo.create(org, p.id, f.input(t.id, u.id))),
    tx.run(() => repo.create(org, p.id, f.input(t.id, u.id, bed.id))),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  const failed = results.find((r) => r.status === 'rejected');
  if (failed?.status === 'rejected')
    expect(failed.reason as unknown).toMatchObject({ code: '23P01' });
  const winner = results.find((r) => r.status === 'fulfilled');
  if (winner?.status !== 'fulfilled') throw new Error('Missing race winner');
  await f
    .post(owner, 'leases/' + winner.value.id + '/terminate', { reason: 'Reset target' })
    .expect(201);
  const first = await f.lease(owner, f.input(t.id, u.id, bed.id));
  const secondBed = data<BedRecord>(
    await f.post(owner, 'units/' + u.id + '/beds', { label: 'B' }).expect(201),
  );
  const second = await f.lease(owner, f.input(t.id, u.id, secondBed.id));
  await f.post(owner, 'leases/' + first.id + '/deposit', { reference: 'bed-a' }).expect(201);
  await f.post(owner, 'leases/' + second.id + '/deposit', { reference: 'bed-b' }).expect(201);
  await f.post(owner, 'leases/' + first.id + '/terminate', { reason: 'A moved' }).expect(201);
  const counts = data<OccupancySnapshot>(await f.get(owner, 'properties/' + p.id + '/occupancy'));
  expect(counts.beds.occupied).toBe(1);
  expect(counts.units.occupied).toBe(1);
  await f.post(owner, 'leases/' + second.id + '/terminate', { reason: 'B moved' }).expect(201);
  expect(
    data<OccupancySnapshot>(await f.get(owner, 'properties/' + p.id + '/occupancy')).units.occupied,
  ).toBe(0);
});
