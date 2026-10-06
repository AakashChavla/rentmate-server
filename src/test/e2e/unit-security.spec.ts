import { PropertyFixture } from './property-fixture';
import { ORIGIN, type FixtureAccount } from './identity-fixture';
import type { UnitRecord, FloorRecord, BedRecord } from '../../shared/unit.types';
const f = new PropertyFixture();
let owner: FixtureAccount;
let foreign: FixtureAccount;
let scoped: FixtureAccount;
let property: string;
let other: string;
let unit: string;
let floor: string;
let bed: string;
beforeAll(async () => {
  await f.start();
  owner = await f.account();
  foreign = await f.account();
  property = (await f.property(owner, 'PG_HOSTEL')).id;
  other = (await f.property(owner)).id;
  scoped = await f.scoped(owner, property);
  const floorResponse = await f
    .http()
    .post(`/api/v1/properties/${property}/floors`)
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ name: 'Ground', level: 0 })
    .expect(201);
  floor = (floorResponse.body as { data: FloorRecord }).data.id;
  const unitResponse = await f
    .http()
    .post(`/api/v1/properties/${property}/units`)
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ floorId: floor, code: 'P01', type: 'ROOM', baseRent: '7500.00', capacity: 2 })
    .expect(201);
  unit = (unitResponse.body as { data: UnitRecord }).data.id;
  const bedResponse = await f
    .http()
    .post(`/api/v1/units/${unit}/beds`)
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ label: 'A' })
    .expect(201);
  bed = (bedResponse.body as { data: BedRecord }).data.id;
});
afterAll(() => f.close());
beforeEach(() => f.resetDomains());
const paths = (): string[] => [
  `properties/${property}/floors`,
  `floors/${floor}`,
  `properties/${property}/units`,
  `units/${unit}`,
  `units/${unit}/config`,
  `units/${unit}/beds`,
  `beds/${bed}`,
  `properties/${property}/occupancy`,
  `units?propertyId=${property}`,
];
it('Org B cannot read any Org A floor, unit, bed, configuration or occupancy endpoint', async () => {
  for (const path of paths())
    await f
      .http()
      .get('/api/v1/' + path)
      .set('Cookie', foreign.cookies)
      .expect(404);
  const list = await f.http().get('/api/v1/units').set('Cookie', foreign.cookies).expect(200);
  expect((list.body as { data: UnitRecord[] }).data).toEqual([]);
});
it('Org B cannot mutate any Org A resource or create children or bulk units', async () => {
  const patches: [string, object][] = [
    [`floors/${floor}`, { name: 'Spoof' }],
    [`units/${unit}`, { code: 'Spoof' }],
    [`units/${unit}/status`, { status: 'OCCUPIED' }],
    [`units/${unit}/config`, { size: '10' }],
    [`beds/${bed}`, { label: 'Spoof' }],
    [`beds/${bed}/status`, { status: 'OCCUPIED' }],
  ];
  for (const [path, input] of patches)
    await f
      .http()
      .patch('/api/v1/' + path)
      .set('Cookie', foreign.cookies)
      .set('Origin', ORIGIN)
      .send(input)
      .expect(404);
  for (const path of [`floors/${floor}`, `units/${unit}`, `beds/${bed}`])
    await f
      .http()
      .delete('/api/v1/' + path)
      .set('Cookie', foreign.cookies)
      .set('Origin', ORIGIN)
      .expect(404);
  const creates: [string, object][] = [
    [`properties/${property}/floors`, { name: 'Spoof', level: 9 }],
    [
      `properties/${property}/units`,
      { code: 'Spoof', type: 'ROOM', capacity: 1, baseRent: '0.00' },
    ],
    [`units/${unit}/beds`, { label: 'Spoof' }],
    [`properties/${property}/units/bulk`, { floors: 1, perFloor: 1, prefix: 'Spoof' }],
  ];
  for (const [path, input] of creates)
    await f
      .http()
      .post('/api/v1/' + path)
      .set('Cookie', foreign.cookies)
      .set('Origin', ORIGIN)
      .send(input)
      .expect(404);
});
it('PROPERTY-scoped managers can access only their granted property', async () => {
  for (const path of paths())
    await f
      .http()
      .get('/api/v1/' + path)
      .set('Cookie', scoped.cookies)
      .expect(200);
  for (const suffix of ['floors', 'units', 'occupancy'])
    await f
      .http()
      .get(`/api/v1/properties/${other}/${suffix}`)
      .set('Cookie', scoped.cookies)
      .expect(403);
  const list = await f.http().get('/api/v1/units').set('Cookie', scoped.cookies).expect(200);
  expect(
    (list.body as { data: UnitRecord[] }).data.every((row) => row.propertyId === property),
  ).toBe(true);
});
