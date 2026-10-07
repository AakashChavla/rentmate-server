import { LeaseFixture, data } from './lease-fixture';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import type { BedRecord } from '../../shared/unit.types';
const f = new LeaseFixture();
beforeAll(() => f.start());
afterAll(() => f.close());
it('prevents whole-unit versus bed booking under competing repeatable-read snapshots', async () => {
  const owner = await f.account(),
    property = await f.property(owner, 'PG_HOSTEL'),
    tenant = await f.tenant(owner, property.id),
    unit = await f.room(owner, property.id);
  await f.verify(owner, tenant);
  const bed = data<BedRecord>(
    await f.post(owner, 'units/' + unit.id + '/beds', { label: 'Snapshot A' }).expect(201),
  );
  const db = f.app.get(DatabaseConnection);
  let arrivals = 0;
  let release = (): void => undefined;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  const insert = (bedId: string | null): Promise<unknown> =>
    db.withManager((manager) =>
      manager.transaction('REPEATABLE READ', async (transaction) => {
        await transaction.query<unknown[]>('SELECT id FROM leases WHERE unit_id=$1', [unit.id]);
        if (++arrivals === 2) release();
        await ready;
        return transaction.query<unknown[]>(
          'INSERT INTO leases (organization_id,property_id,tenant_id,unit_id,bed_id,start_date,end_date,rent,deposit,due_day) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,5)',
          [
            owner.me.organization.id,
            property.id,
            tenant.id,
            unit.id,
            bedId,
            '2026-01-01',
            '2027-01-01',
            '1000.00',
            '1000.00',
          ],
        );
      }),
    );
  const results = await Promise.allSettled([insert(null), insert(bed.id)]);
  expect(results.filter((row) => row.status === 'fulfilled')).toHaveLength(1);
  const failed = results.find((row) => row.status === 'rejected');
  if (failed?.status === 'rejected')
    expect(failed.reason as unknown).toMatchObject({ code: '23P01' });
});
