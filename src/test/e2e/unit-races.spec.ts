import { PropertyFixture } from './property-fixture';
import { ORIGIN, type FixtureAccount } from './identity-fixture';
import { UnitRepository, UnitsService } from '../../modules/units';
import { BedsService } from '../../modules/beds';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import type { UnitRecord } from '../../shared/unit.types';
const f = new PropertyFixture();
let owner: FixtureAccount;
beforeAll(async () => {
  await f.start();
  owner = await f.account();
});
afterAll(() => f.close());
beforeEach(() => f.resetDomains());
async function room(): Promise<UnitRecord> {
  const property = (await f.property(owner, 'PG_HOSTEL')).id;
  return f.app
    .get(UnitsService)
    .create(owner.me, property, { code: 'Race', type: 'ROOM', baseRent: '0.00', capacity: 2 });
}
it('serializes simultaneous bed creation so capacity cannot be exceeded', async () => {
  const unit = await room();
  const responses = await Promise.all(
    ['A', 'B', 'C'].map((label) =>
      f
        .http()
        .post(`/api/v1/units/${unit.id}/beds`)
        .set('Cookie', owner.cookies)
        .set('Origin', ORIGIN)
        .send({ label }),
    ),
  );
  expect(responses.map((r) => r.status).sort()).toEqual([201, 201, 409]);
  expect(await f.app.get(UnitRepository).bedCount(owner.me.organization.id, unit.id)).toBe(2);
});
it('rechecks a parent deleted after initial authorization but before the property lock', async () => {
  const unit = await room();
  const bed = await f.app.get(BedsService).create(owner.me, unit.id, 'A');
  const repo = f.app.get(UnitRepository);
  const lock = repo.lockProperty.bind(repo);
  const spy = jest.spyOn(repo, 'lockProperty').mockImplementationOnce(async (org, property) => {
    await f.app
      .get(DatabaseConnection)
      .withManager((m) =>
        m.dataSource.manager.query<unknown>(
          'UPDATE units SET deleted_at=NOW() WHERE organization_id=$1 AND id=$2',
          [org, unit.id],
        ),
      );
    await lock(org, property);
  });
  try {
    await expect(f.app.get(BedsService).update(owner.me, bed.id, 'Changed')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  } finally {
    spy.mockRestore();
  }
});
