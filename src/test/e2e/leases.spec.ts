import { LeaseFixture, data } from './lease-fixture';
import type { FixtureAccount } from './identity-fixture';
import { ORIGIN } from './identity-fixture';
import { TenantRepository } from '../../modules/tenants';
import { LeaseExpiryJob, LeaseRepository, LeasesService } from '../../modules/leases';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import type { LeaseView } from '../../shared/lease.types';
import type { UnitRecord, OccupancySnapshot } from '../../shared/unit.types';
const f = new LeaseFixture();
let owner: FixtureAccount;
beforeAll(async () => {
  await f.start();
  owner = await f.account();
});
afterAll(() => f.close());
beforeEach(() => f.resetDomains());
it('onboards, masks encrypted IDs, verifies KYC, activates, renews and terminates', async () => {
  const p = await f.property(owner),
    t = await f.tenant(owner, p.id),
    u = await f.room(owner, p.id);
  expect(t.maskedId).toBe('••••9012');
  expect(JSON.stringify(t)).not.toMatch(/idCipher|idHash|123456789012/);
  const stored = await f.app.get(TenantRepository).get(owner.me.organization.id, t.id);
  expect(stored?.idCipher).toContain('fixture-v1');
  await f.post(owner, 'leases', f.input(t.id, u.id)).expect(409);
  await f.verify(owner, t);
  const lease = await f.lease(owner, f.input(t.id, u.id));
  await f.post(owner, 'leases/' + lease.id + '/deposit', { reference: 'receipt-1' }).expect(201);
  await f.post(owner, 'leases/' + lease.id + '/deposit', { reference: 'receipt-1' }).expect(201);
  expect(data<UnitRecord>(await f.get(owner, 'units/' + u.id)).status).toBe('OCCUPIED');
  const next = await f
    .post(owner, 'leases/' + lease.id + '/renew', {
      ...f.input(t.id, u.id),
      startDate: '2027-01-01',
      endDate: '2028-01-01',
    })
    .expect(201);
  expect(data<LeaseView>(next).renewedFromId).toBe(lease.id);
  await f.post(owner, 'leases/' + lease.id + '/terminate', { reason: 'Moved out' }).expect(201);
  expect(data<UnitRecord>(await f.get(owner, 'units/' + u.id)).status).toBe('VACANT');
});
it('rejects MIME spoofing and authenticates signed downloads with expiry', async () => {
  const p = await f.property(owner),
    t = await f.tenant(owner, p.id);
  await f
    .http()
    .post('/api/v1/tenants/' + t.id + '/documents/AADHAAR')
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .attach('file', Buffer.from('<script>'), { filename: 'id.pdf', contentType: 'application/pdf' })
    .expect(400);
  const doc = await f.upload(owner, t.id),
    signed = await f.get(owner, 'documents/' + doc.id + '/download').expect(200);
  const url = data<{ url: string }>(signed).url;
  await f.http().get(url).expect(401);
  await f.http().get(url).set('Cookie', owner.cookies).expect(200);
  await f
    .http()
    .get(url.replace(/expires=[0-9]+/, 'expires=1'))
    .set('Cookie', owner.cookies)
    .expect(410);
});
it('prevents parallel double booking at the HTTP and database layers', async () => {
  const p = await f.property(owner),
    t = await f.tenant(owner, p.id),
    u = await f.room(owner, p.id);
  await f.verify(owner, t);
  const input = f.input(t.id, u.id);
  const results = await Promise.all([
    f.post(owner, 'leases', input),
    f.post(owner, 'leases', input),
  ]);
  expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  const rejected = results.find((r) => r.status === 409);
  expect((rejected?.body as { error: { code: string } }).error.code).toBe('LEASE_OVERLAP');
  const db = f.app.get(DatabaseConnection);
  await expect(
    db.withManager((m) =>
      m.query<unknown[]>(
        'INSERT INTO leases (organization_id,property_id,tenant_id,unit_id,start_date,end_date,rent,deposit,due_day) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,5)',
        [
          owner.me.organization.id,
          p.id,
          t.id,
          u.id,
          input.startDate,
          input.endDate,
          input.rent,
          input.deposit,
        ],
      ),
    ),
  ).rejects.toMatchObject({ code: '23P01' });
});
it('expires idempotently and invalidates unit occupancy', async () => {
  const p = await f.property(owner),
    t = await f.tenant(owner, p.id),
    u = await f.room(owner, p.id);
  await f.verify(owner, t);
  const l = await f.lease(owner, f.input(t.id, u.id));
  await f.post(owner, 'leases/' + l.id + '/deposit', { reference: 'deposit-expiry' }).expect(201);
  await f.app.get(LeasesService).expiry(owner.me.organization.id, l.id, '2027-01-01');
  await f.app.get(LeasesService).expiry(owner.me.organization.id, l.id, '2027-01-01');
  expect(data<LeaseView>(await f.get(owner, 'leases/' + l.id)).status).toBe('EXPIRED');
  expect(
    data<OccupancySnapshot>(await f.get(owner, 'properties/' + p.id + '/occupancy')).units.occupied,
  ).toBe(0);
  await f.app.get(LeaseExpiryJob).handle('fixture', {});
  expect((await f.app.get(LeaseRepository).get(owner.me.organization.id, l.id))?.status).toBe(
    'EXPIRED',
  );
});
