import { randomUUID } from 'node:crypto';
import { RedisKeyValueStore } from '../../../src/core/redis/redis-key-value-store';
import type { KeyValueStore } from '../../../src/core/redis/key-value-store.contract';
import { ORGANIZATION_VERSION } from '../../../src/shared/property.constants';
import { OCCUPANCY_KEYS, OCCUPANCY_TTL } from '../../../src/shared/unit.constants';
import { IDENTITY_TTL } from '../../../src/shared/identity.constants';
import type { DemoContext } from './context';
export async function invalidateDemo(context: DemoContext): Promise<void> {
  const store: KeyValueStore = new RedisKeyValueStore(context.config);
  try {
    await store.connect();
    await store.set(
      ORGANIZATION_VERSION(context.orgId),
      randomUUID(),
      IDENTITY_TTL.ACCESS + IDENTITY_TTL.CONTEXT,
    );
    for (const property of context.properties.values()) {
      await store.set(
        OCCUPANCY_KEYS.version(context.orgId, property.id),
        randomUUID(),
        OCCUPANCY_TTL * 2,
      );
      await store.delete(OCCUPANCY_KEYS.data(context.orgId, property.id));
    }
  } finally {
    await store.close();
  }
}
