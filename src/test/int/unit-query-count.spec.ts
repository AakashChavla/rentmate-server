import { PropertyFixture } from '../e2e/property-fixture';
import type { FixtureAccount } from '../e2e/identity-fixture';
import { UnitRepository, FloorRepository, UnitsService } from '../../modules/units';
import { OccupancyReadModel } from '../../modules/occupancy';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { countQueries } from './query-count';
import { UNIT_INPUT } from './unit-isolation-context';
const f = new PropertyFixture();
let owner: FixtureAccount;
let property: string;
let unitId: string;
let smallCount: number;
beforeAll(async () => {
  await f.start();
  owner = await f.account();
  property = (await f.property(owner)).id;
  const org = owner.me.organization.id;
  const floors = f.app.get(FloorRepository),
    units = f.app.get(UnitRepository);
  const floor = await floors.create(org, property, { name: 'First', level: 1 });
  const first = await units.create(org, property, { ...UNIT_INPUT, floorId: floor.id });
  unitId = first.id;
  smallCount = (
    await countQueries(f.app.get(DatabaseConnection), () =>
      units.list(org, { propertyId: property }, undefined),
    )
  ).count;
  await f.app.get(TransactionRunner).run(() =>
    units.bulk(
      org,
      property,
      Array.from({ length: 50 }, (_, i) => ({
        ...UNIT_INPUT,
        code: 'Q' + String(i),
        floorId: floor.id,
      })),
    ),
  );
  const rows = (await units.list(org, { propertyId: property }, undefined)).items;
  for (const unit of rows.slice(0, 17)) await units.setStatus(org, unit.id, 'OCCUPIED');
});
afterAll(() => f.close());
it('lists a full page with floor metadata in a fixed number of SQL queries', async () => {
  const page = await countQueries(f.app.get(DatabaseConnection), () =>
    f.app.get(UnitRepository).list(owner.me.organization.id, { propertyId: property }, undefined),
  );
  expect(page.count).toBe(smallCount);
  expect(page.count).toBeLessThanOrEqual(2);
  expect(page.result.items).toHaveLength(50);
  expect(page.result.items.every((row) => row.floorName === 'First')).toBe(true);
  expect(page.result.nextCursor).not.toBeNull();
});
it('computes rounded occupancy and reuses the cache until a status event invalidates it', async () => {
  const model = f.app.get(OccupancyReadModel),
    db = f.app.get(DatabaseConnection);
  const cold = await countQueries(db, () => model.get(owner.me, property));
  expect(cold.result.units).toEqual({ occupied: 17, total: 51, percent: 33.33 });
  const warm = await countQueries(db, () => model.get(owner.me, property));
  expect(warm.count).toBeLessThan(cold.count);
  expect(warm.result).toEqual(cold.result);
  await f.app.get(UnitsService).status(owner.me, unitId, { status: 'OCCUPIED' });
  expect((await model.get(owner.me, property)).units.occupied).toBe(18);
});
