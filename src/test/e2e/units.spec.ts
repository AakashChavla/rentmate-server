import { PropertyFixture } from './property-fixture';
import { ORIGIN, type FixtureAccount } from './identity-fixture';
import { PROPERTY_TYPE as T } from '../../shared/property.constants';
import type {
  UnitRecord,
  FloorRecord,
  BedRecord,
  OccupancySnapshot,
} from '../../shared/unit.types';
const fixture = new PropertyFixture();
let owner: FixtureAccount;
const unitInput = { code: 'R101', type: 'ROOM', baseRent: '12500.50', capacity: 2 };
function post(
  account: FixtureAccount,
  path: string,
  input: object,
): ReturnType<ReturnType<typeof fixture.http>['post']> {
  return fixture
    .http()
    .post('/api/v1/' + path)
    .set('Cookie', account.cookies)
    .set('Origin', ORIGIN)
    .send(input);
}
function patch(
  account: FixtureAccount,
  path: string,
  input: object,
): ReturnType<ReturnType<typeof fixture.http>['patch']> {
  return fixture
    .http()
    .patch('/api/v1/' + path)
    .set('Cookie', account.cookies)
    .set('Origin', ORIGIN)
    .send(input);
}
beforeAll(async () => {
  await fixture.start();
  owner = await fixture.account();
});
afterAll(async () => {
  await fixture.close();
});
beforeEach(async () => {
  await fixture.resetDomains();
});

it('creates floors, stores decimal rent, filters and validates configuration', async () => {
  const property = await fixture.property(owner);
  const floor = (
    await post(owner, `properties/${property.id}/floors`, {
      name: 'First',
      level: 1,
      wing: 'A',
    }).expect(201)
  ).body as { data: FloorRecord };
  const unit = (
    await post(owner, `properties/${property.id}/units`, {
      ...unitInput,
      floorId: floor.data.id,
    }).expect(201)
  ).body as { data: UnitRecord };
  expect(unit.data.baseRent).toBe('12500.50');
  await patch(owner, `units/${unit.data.id}/config`, {
    amenities: ['WIFI'],
    size: '25.50',
  }).expect(200);
  await patch(owner, `units/${unit.data.id}/config`, { amenities: ['INVALID'] }).expect(400);
  await patch(owner, `units/${unit.data.id}`, { baseRent: null }).expect(400);
  const list = await get(
    `units?propertyId=${property.id}&floorId=${floor.data.id}&search=R1`,
  ).expect(200);
  expect((list.body as { data: UnitRecord[] }).data.map((u) => u.id)).toEqual([unit.data.id]);
  await patch(owner, `units/${unit.data.id}`, { code: 'R102', baseRent: '13000.00' }).expect(200);
  await del(`floors/${floor.data.id}`).expect(409);
  await del(`units/${unit.data.id}`).expect(200);
  await del(`floors/${floor.data.id}`).expect(200);
});
it('invalidates occupancy after transitions and rejects illegal and stale changes', async () => {
  const property = await fixture.property(owner);
  const unit = (await post(owner, `properties/${property.id}/units`, unitInput).expect(201))
    .body as { data: UnitRecord };
  const url = `/api/v1/properties/${property.id}/occupancy`;
  const initial = await fixture.http().get(url).set('Cookie', owner.cookies).expect(200);
  expect((initial.body as { data: OccupancySnapshot }).data.units).toEqual({
    total: 1,
    occupied: 0,
    percent: 0,
  });
  await patch(owner, `units/${unit.data.id}/status`, {
    status: 'OCCUPIED',
    expectedStatus: 'VACANT',
  }).expect(200);
  const occupied = await fixture.http().get(url).set('Cookie', owner.cookies).expect(200);
  expect((occupied.body as { data: OccupancySnapshot }).data.units.percent).toBe(100);
  await patch(owner, `units/${unit.data.id}/status`, { status: 'BLOCKED' }).expect(409);
  await patch(owner, `units/${unit.data.id}/status`, {
    status: 'VACANT',
    expectedStatus: 'VACANT',
  }).expect(409);
  await del(`units/${unit.data.id}`).expect(409);
  await patch(owner, `units/${unit.data.id}/status`, { status: 'VACANT' }).expect(200);
  const vacant = await fixture.http().get(url).set('Cookie', owner.cookies).expect(200);
  expect((vacant.body as { data: OccupancySnapshot }).data.units.percent).toBe(0);
});

it('allows beds only in PG rooms and enforces capacity', async () => {
  const pg = await fixture.property(owner, T.PG);
  const unit = (await post(owner, `properties/${pg.id}/units`, unitInput).expect(201)).body as {
    data: UnitRecord;
  };
  const bed = (await post(owner, `units/${unit.data.id}/beds`, { label: 'A' }).expect(201))
    .body as { data: BedRecord };
  await post(owner, `units/${unit.data.id}/beds`, { label: 'B' }).expect(201);
  await post(owner, `units/${unit.data.id}/beds`, { label: 'C' }).expect(409);
  await patch(owner, `units/${unit.data.id}`, { capacity: 1 }).expect(409);
  await patch(owner, `units/${unit.data.id}`, { type: 'FLAT' }).expect(400);
  await patch(owner, `beds/${bed.data.id}`, { label: 'A1' }).expect(200);
  await patch(owner, `beds/${bed.data.id}/status`, { status: 'OCCUPIED' }).expect(200);
  const result = await get(`properties/${pg.id}/occupancy`).expect(200);
  expect((result.body as { data: OccupancySnapshot }).data.beds).toEqual({
    occupied: 1,
    total: 2,
    percent: 50,
  });
  await patch(owner, `beds/${bed.data.id}/status`, { status: 'VACANT' }).expect(200);
  await del(`beds/${bed.data.id}`).expect(200);
  const hotel = await fixture.property(owner);
  const room = (await post(owner, `properties/${hotel.id}/units`, unitInput).expect(201)).body as {
    data: UnitRecord;
  };
  await post(owner, `units/${room.data.id}/beds`, { label: 'A' }).expect(400);
});
it('creates synchronous bulk atomically and rolls back duplicate codes', async () => {
  const property = await fixture.property(owner);
  const path = `properties/${property.id}/units/bulk`;
  const result = await post(owner, path, { floors: 2, perFloor: 3, prefix: 'B' }).expect(201);
  expect((result.body as { data: { mode: string; createdCount: number } }).data).toMatchObject({
    mode: 'SYNC',
    createdCount: 6,
  });
  await post(owner, path, { floors: 2, perFloor: 4, prefix: 'B' }).expect(409);
  const list = await get(`units?propertyId=${property.id}`).expect(200);
  expect((list.body as { data: UnitRecord[] }).data).toHaveLength(6);
});

function del(path: string): ReturnType<ReturnType<typeof fixture.http>['delete']> {
  return fixture
    .http()
    .delete('/api/v1/' + path)
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN);
}
function get(path: string): ReturnType<ReturnType<typeof fixture.http>['get']> {
  return fixture
    .http()
    .get('/api/v1/' + path)
    .set('Cookie', owner.cookies);
}
