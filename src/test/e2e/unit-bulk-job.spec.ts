import { setTimeout } from 'node:timers/promises';
import { PropertyFixture } from './property-fixture';
import { ORIGIN, type FixtureAccount } from './identity-fixture';
import { WorkerHost } from '../../core/queue/worker-host.contract';
import { QUEUE_NAMES } from '../../core/config/config.constants';
import { BulkUnitsJob } from '../../modules/units';
import type { BulkRecord, BulkResult, UnitRecord } from '../../shared/unit.types';
const f = new PropertyFixture();
let owner: FixtureAccount;
let foreign: FixtureAccount;
beforeAll(async () => {
  await f.start();
  f.app.get(WorkerHost).register(QUEUE_NAMES.UNITS_BULK, f.app.get(BulkUnitsJob));
  owner = await f.account();
  foreign = await f.account();
});
afterAll(() => f.close());
beforeEach(() => f.resetDomains());
async function submit(property: string, count: number): Promise<BulkResult> {
  const result = await f
    .http()
    .post(`/api/v1/properties/${property}/units/bulk`)
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ floors: 1, perFloor: count, prefix: 'J' })
    .expect(201);
  return (result.body as { data: BulkResult }).data;
}
async function completion(property: string, id: string): Promise<BulkRecord> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const response = await f
      .http()
      .get(`/api/v1/properties/${property}/units/bulk/${id}`)
      .set('Cookie', owner.cookies)
      .expect(200);
    const job = (response.body as { data: BulkRecord }).data;
    if (job.status === 'COMPLETED' || job.status === 'FAILED') return job;
    await setTimeout(100);
  }
  throw new Error('Bulk fixture job timed out');
}
it('processes a real BullMQ job, is idempotent, scopes status, and rolls back duplicate batches', async () => {
  const property = (await f.property(owner)).id;
  const queued = await submit(property, 101);
  expect(queued.mode).toBe('QUEUED');
  if (!queued.jobId) throw new Error('Missing job id');
  expect(await completion(property, queued.jobId)).toMatchObject({
    status: 'COMPLETED',
    createdCount: 101,
  });
  await f.app
    .get(BulkUnitsJob)
    .handle(queued.jobId, { id: queued.jobId, organizationId: owner.me.organization.id });
  await f
    .http()
    .get(`/api/v1/properties/${property}/units/bulk/${queued.jobId}`)
    .set('Cookie', foreign.cookies)
    .expect(404);
  const duplicate = await submit(property, 102);
  if (!duplicate.jobId) throw new Error('Missing duplicate job id');
  expect(await completion(property, duplicate.jobId)).toMatchObject({
    status: 'FAILED',
    createdCount: 0,
    errorCode: 'DUPLICATE_UNIT_CODE',
  });
  let cursor: string | undefined;
  const ids: string[] = [];
  for (let page = 0; page < 4; page++) {
    const response = await f
      .http()
      .get(`/api/v1/units?propertyId=${property}${cursor ? '&cursor=' + cursor : ''}`)
      .set('Cookie', owner.cookies)
      .expect(200);
    const body = response.body as {
      data: UnitRecord[];
      meta: { page: { nextCursor: string | null } };
    };
    ids.push(...body.data.map((unit) => unit.id));
    cursor = body.meta.page.nextCursor ?? undefined;
    if (!cursor) break;
  }
  expect(ids).toHaveLength(101);
  expect(new Set(ids).size).toBe(101);
});
