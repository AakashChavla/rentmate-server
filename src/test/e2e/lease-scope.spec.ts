import { LeaseFixture, data } from './lease-fixture';
import { LeaseExpiryJob, LeaseRepository } from '../../modules/leases';
import { DocumentRepository } from '../../modules/documents';
import { TenantRepository } from '../../modules/tenants';
import { ORIGIN } from './identity-fixture';
import type { TenantView, LeaseView } from '../../shared/lease.types';
const f = new LeaseFixture();
beforeAll(() => f.start());
afterAll(() => f.close());
beforeEach(() => f.resetDomains());
it('requires both linked ownership and property scope for tenant portal records', async () => {
  const owner = await f.account(),
    first = await f.property(owner),
    second = await f.property(owner);
  const member = await f.member(owner, 'TENANT');
  const own = await f.tenant(owner, first.id, member.email);
  const other = await f.tenant(owner, second.id, member.email);
  await f.app
    .get(TenantRepository)
    .linkInvitation(owner.me.organization.id, member.email, null, member.me.user.id);
  const assignment = member.me.roles.find((r) => r.role === 'TENANT');
  if (!assignment) throw new Error('Missing tenant assignment');
  await f
    .http()
    .delete('/api/v1/users/' + member.me.user.id + '/roles/' + assignment.id)
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .expect(200);
  await f
    .post(owner, 'users/' + member.me.user.id + '/roles', {
      role: 'TENANT',
      scope: 'PROPERTY',
      scopeId: first.id,
    })
    .expect(201);
  await f.verify(owner, other);
  const unit = await f.room(owner, second.id);
  const lease = await f.lease(owner, f.input(other.id, unit.id));
  await f.get(member, 'tenants/' + own.id).expect(200);
  for (const path of [
    'tenants/' + other.id,
    'tenants/' + other.id + '/documents',
    'leases/' + lease.id,
  ])
    await f.get(member, path).expect(403);
  expect(data<TenantView[]>(await f.get(member, 'tenants')).map((t) => t.id)).toEqual([own.id]);
  expect(data<LeaseView[]>(await f.get(member, 'leases'))).toEqual([]);
  await f
    .http()
    .patch('/api/v1/tenants/' + own.id)
    .set('Cookie', member.cookies)
    .set('Origin', ORIGIN)
    .send({ phone: '9988776655' })
    .expect(200);
});
it('enforces property scope on tenant, document and lease operations', async () => {
  const owner = await f.account(),
    first = await f.property(owner),
    second = await f.property(owner),
    manager = await f.scoped(owner, first.id);
  const own = await f.tenant(owner, first.id),
    other = await f.tenant(owner, second.id),
    unit = await f.room(owner, second.id);
  await f.verify(owner, other);
  const lease = await f.lease(owner, f.input(other.id, unit.id));
  const doc = (await f.app.get(DocumentRepository).list(owner.me.organization.id, other.id))[0];
  if (!doc) throw new Error('Missing fixture document');
  await f.get(manager, 'tenants/' + own.id).expect(200);
  for (const path of [
    'tenants/' + other.id,
    'tenants/' + other.id + '/documents',
    'documents/' + doc.id + '/download',
    'leases/' + lease.id,
  ])
    await f.get(manager, path).expect(403);
  expect(data<TenantView[]>(await f.get(manager, 'tenants')).map((t) => t.id)).toEqual([own.id]);
  expect(data<LeaseView[]>(await f.get(manager, 'leases'))).toEqual([]);
  await f.post(manager, 'leases', f.input(other.id, unit.id)).expect(403);
  await f.post(manager, 'leases/' + lease.id + '/deposit', { reference: 'forbidden' }).expect(403);
});
it('runs concurrent expiry sweeps once and permits repeated completed jobs', async () => {
  const owner = await f.account(),
    property = await f.property(owner),
    tenant = await f.tenant(owner, property.id),
    unit = await f.room(owner, property.id);
  await f.verify(owner, tenant);
  const lease = await f.lease(owner, { ...f.input(tenant.id, unit.id), endDate: '2026-01-02' });
  await f.post(owner, 'leases/' + lease.id + '/deposit', { reference: 'job-expiry' }).expect(201);
  const job = f.app.get(LeaseExpiryJob);
  await Promise.all([job.handle('first', {}), job.handle('second', {})]);
  await job.handle('retry', {});
  expect((await f.app.get(LeaseRepository).get(owner.me.organization.id, lease.id))?.status).toBe(
    'EXPIRED',
  );
  expect(
    data<{ units: { occupied: number } }>(
      await f.get(owner, 'properties/' + property.id + '/occupancy'),
    ).units.occupied,
  ).toBe(0);
});
