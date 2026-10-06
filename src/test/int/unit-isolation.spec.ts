import { PropertyFixture } from '../e2e/property-fixture';
import { UnitRepository, FloorRepository, BulkJobRepository } from '../../modules/units';
import { BedRepository } from '../../modules/beds';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { verifyIsolation } from './isolation-harness';
import { unitReadCases, unitWriteCases } from './unit-isolation-cases';
import { floorCases, bedCases, jobCases } from './floor-bed-isolation-cases';
import {
  UNIT_INPUT,
  BULK_INPUT,
  UNIT_CONFIG,
  type UnitIsolationContext,
} from './unit-isolation-context';
const f = new PropertyFixture();
let c: UnitIsolationContext;
beforeAll(async () => {
  await f.start();
  const owner = await f.account();
  const foreign = (await f.account()).me.organization.id;
  const org = owner.me.organization.id;
  const property = (await f.property(owner, 'PG_HOSTEL')).id;
  const units = f.app.get(UnitRepository),
    floors = f.app.get(FloorRepository);
  const beds = f.app.get(BedRepository),
    jobs = f.app.get(BulkJobRepository);
  const floor = await floors.create(org, property, { name: 'First', level: 1 });
  const unit = await units.create(org, property, { ...UNIT_INPUT, floorId: floor.id });
  await units.setConfig(org, property, unit.id, { ...UNIT_CONFIG, amenities: [] });
  const bed = await beds.create(org, property, unit.id, 'A');
  const job = await jobs.create(org, property, owner.me.user.id, BULK_INPUT);
  c = {
    owner,
    org,
    foreign,
    property,
    units,
    floors,
    beds,
    jobs,
    floor,
    unit,
    bed,
    job,
    tx: f.app.get(TransactionRunner),
  };
});
afterAll(() => f.close());
it('reflection covers every new repository method and composite ownership foreign key', async () => {
  await verifyIsolation(c.units, { ...unitReadCases(c), ...unitWriteCases(c) });
  await verifyIsolation(c.floors, floorCases(c));
  await verifyIsolation(c.beds, bedCases(c));
  await verifyIsolation(c.jobs, jobCases(c));
  expect((await c.units.get(c.org, c.unit.id))?.code).toBe(UNIT_INPUT.code);
  expect((await c.beds.get(c.org, c.bed.id))?.label).toBe('A');
});
