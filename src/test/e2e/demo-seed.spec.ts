import { seedDemo } from '../../../tools/seeds/demo/seed-demo';
import { ACCOUNTS, DEMO } from '../../../tools/seeds/demo/catalog';
import { LeaseFixture, data } from './lease-fixture';
import { ORIGIN, FIXTURE_PASSWORD, type FixtureAccount } from './identity-fixture';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import type { PermissionContext } from '../../shared/identity.types';
import type { TenantView, LeaseView, DocumentView } from '../../shared/lease.types';
import type { PropertyRecord } from '../../shared/property.types';
import { ROLE } from '../../shared/identity.constants';
import { TenantRepository } from '../../modules/tenants';
import { AesFieldEncryptor } from '../../integrations/field-encryption/adapters/aes/aes-field-encryptor';
import { AppConfigService } from '../../core/config/default-app-config.service';
import { FileStorage } from '../../integrations/file-storage/file-storage.contract';
class DemoFixture extends LeaseFixture {
  public track(id: string): void {
    this.orgs.add(id);
  }
}
const f = new DemoFixture(),
  accounts = new Map<string, FixtureAccount>();
let database: DatabaseConnection, orgId: string, unrelatedPropertyId: string;
beforeAll(async () => {
  await f.start();
  database = f.app.get(DatabaseConnection);
  unrelatedPropertyId = (await f.property(await f.account())).id;
  await database.withManager(async (manager) => {
    await Promise.all([
      seedDemo(manager.dataSource, FIXTURE_PASSWORD),
      seedDemo(manager.dataSource, FIXTURE_PASSWORD),
    ]);
  });
  orgId = await database.withManager(async (m) => {
    const rows = await m.query<{ id: string }[]>('SELECT id FROM organizations WHERE slug=$1', [
      DEMO.slug,
    ]);
    if (!rows[0]) throw new Error('Missing demo organization');
    return rows[0].id;
  });
  f.track(orgId);
});
afterAll(async () => {
  if (orgId) {
    const files = await database.withManager((m) =>
      m.query<{ storage_key: string }[]>(
        'SELECT storage_key FROM tenant_documents WHERE organization_id=$1',
        [orgId],
      ),
    );
    for (const file of files) await f.app.get(FileStorage).remove(file.storage_key);
  }
  await f.close();
});
beforeEach(() => f.resetDomains());
it('is repeatable under concurrent runs and authenticates every current role', async () => {
  const counts = await database.withManager((m) =>
    m.query<{ table_name: string; count: number }[]>(
      `SELECT 'users' table_name, count(*)::int count FROM users WHERE organization_id=$1
     UNION ALL SELECT 'properties', count(*)::int FROM properties WHERE organization_id=$1
     UNION ALL SELECT 'units', count(*)::int FROM units WHERE organization_id=$1
     UNION ALL SELECT 'beds', count(*)::int FROM beds WHERE organization_id=$1
     UNION ALL SELECT 'tenants', count(*)::int FROM tenants WHERE organization_id=$1
     UNION ALL SELECT 'documents', count(*)::int FROM tenant_documents WHERE organization_id=$1
     UNION ALL SELECT 'leases', count(*)::int FROM leases WHERE organization_id=$1`,
      [orgId],
    ),
  );
  expect(Object.fromEntries(counts.map((r) => [r.table_name, r.count]))).toEqual({
    users: 8,
    properties: 4,
    units: 33,
    beds: 24,
    tenants: 12,
    documents: 12,
    leases: 8,
  });
  for (const account of ACCOUNTS) {
    const response = await f
      .http()
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .send({ email: account.role.toLowerCase() + '@' + DEMO.domain, password: FIXTURE_PASSWORD })
      .expect(200);
    const me = data<PermissionContext>(response);
    expect(me.roles.some((r) => r.role === account.role)).toBe(true);
    accounts.set(account.role, {
      me,
      email: me.user.email,
      cookies: (response.headers['set-cookie'] as unknown as string[]).map(
        (c) => c.split(';')[0] ?? '',
      ),
    });
  }
});
it('shows scoped manager data and only the tenant account own encrypted records', async () => {
  const manager = accounts.get(ROLE.MANAGER),
    tenant = accounts.get(ROLE.TENANT);
  if (!manager || !tenant) throw new Error('Missing authenticated demo accounts');
  const properties = data<PropertyRecord[]>(await f.get(manager, 'properties?mine=true'));
  expect(properties.map((p) => p.name)).toEqual(['Saffron Courtyard Hotel']);
  const own = data<TenantView[]>(await f.get(tenant, 'tenants'));
  expect(own.map((t) => t.fullName)).toEqual(['Neha Joshi']);
  const first = own[0];
  if (!first) throw new Error('Missing own demo tenant');
  const record = await f.app.get(TenantRepository).get(orgId, first.id);
  if (!record?.idCipher) throw new Error('Missing encrypted demo ID');
  expect(new AesFieldEncryptor(new AppConfigService()).decrypt(record.idCipher)).toBe(
    'DEMO-ID-0001',
  );
  expect(data<LeaseView[]>(await f.get(tenant, 'leases'))).toHaveLength(1);
  const documents = data<DocumentView[]>(await f.get(tenant, 'tenants/' + first.id + '/documents'));
  const document = documents[0];
  if (!document) throw new Error('Missing private demo document');
  const signed = data<{ url: string }>(
    await f.get(tenant, 'documents/' + document.id + '/download'),
  );
  await f.http().get(signed.url).set('Cookie', tenant.cookies).expect(200);
  await f.get(manager, 'tenants/' + first.id).expect(403);
});
it('preserves edited demo records and unrelated application records on rerun', async () => {
  await database.withManager(async (m) => {
    await m.query(
      'UPDATE tenants SET full_name=$1 WHERE organization_id=$2 AND user_id IS NOT NULL',
      ['Edited demo tenant', orgId],
    );
    await seedDemo(m.dataSource, FIXTURE_PASSWORD);
    const tenants = await m.query<{ full_name: string }[]>(
      'SELECT full_name FROM tenants WHERE organization_id=$1 AND user_id IS NOT NULL',
      [orgId],
    );
    expect(tenants.map((t) => t.full_name)).toEqual(['Edited demo tenant']);
    const property = await m.query<{ id: string }[]>('SELECT id FROM properties WHERE id=$1', [
      unrelatedPropertyId,
    ]);
    expect(property).toHaveLength(1);
  });
});
it('rejects production demo seeding', async () => {
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    await expect(
      database.withManager((m) => seedDemo(m.dataSource, FIXTURE_PASSWORD)),
    ).rejects.toThrow('local development/test');
  } finally {
    process.env.NODE_ENV = original;
  }
});
