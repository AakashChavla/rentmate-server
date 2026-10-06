import { RedisOccupancyStore } from './redis-occupancy.store';
import { FakeKeyValueStore } from '../../test/fakes/fake-key-value-store';
import { UuidIdGenerator } from '../../core/ids/uuid-id-generator';
import { OCCUPANCY_TTL, OCCUPANCY_KEYS } from '../../shared/unit.constants';
const value = {
  units: { occupied: 1, total: 3, percent: 33.33 },
  beds: { occupied: 0, total: 0, percent: 0 },
};
afterEach(() => jest.useRealTimers());
it('caches for two minutes and rejects a stale writer after invalidation', async () => {
  jest.useFakeTimers();
  const kv = new FakeKeyValueStore();
  const store = new RedisOccupancyStore(kv, new UuidIdGenerator());
  const initial = await store.version('org', 'property');
  expect(await store.set('org', 'property', value, initial)).toBe(true);
  expect(await store.get('org', 'property')).toEqual(value);
  jest.advanceTimersByTime(OCCUPANCY_TTL);
  expect(await store.get('org', 'property')).toBeNull();
  await store.invalidate('org', 'property');
  expect(await store.set('org', 'property', value, initial)).toBe(false);
  const current = await store.version('org', 'property');
  expect(await store.set('org', 'property', value, current)).toBe(true);
  expect(await store.get('other-org', 'property')).toBeNull();
  await kv.set(OCCUPANCY_KEYS.data('org', 'property'), 'invalid json', OCCUPANCY_TTL);
  expect(await store.get('org', 'property')).toBeNull();
});
