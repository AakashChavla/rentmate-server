import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { OccupancyStore } from './occupancy.contract';
import { KeyValueStore } from '../../core/redis/key-value-store.contract';
import { IdGenerator } from '../../core/ids/id-generator.contract';
import { OCCUPANCY_TTL, OCCUPANCY_KEYS as K } from '../../shared/unit.constants';
import type { OccupancySnapshot } from '../../shared/unit.types';
const count = z.object({
  occupied: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  percent: z.number().nonnegative(),
});
const snapshot = z.object({ version: z.string(), value: z.object({ units: count, beds: count }) });
@Injectable()
export class RedisOccupancyStore extends OccupancyStore {
  public constructor(
    @Inject(KeyValueStore) private readonly store: KeyValueStore,
    @Inject(IdGenerator) private readonly ids: IdGenerator,
  ) {
    super();
  }
  public override async version(org: string, property: string): Promise<string> {
    return (await this.store.get(K.version(org, property))) ?? '0';
  }
  public override async get(org: string, property: string): Promise<OccupancySnapshot | null> {
    const raw = await this.store.get(K.data(org, property));
    if (!raw) return null;
    try {
      const value = snapshot.safeParse(JSON.parse(raw) as unknown);
      if (!value.success || value.data.version !== (await this.version(org, property))) return null;
      return value.data.value;
    } catch {
      return null;
    }
  }
  public override set(
    org: string,
    property: string,
    value: OccupancySnapshot,
    version: string,
  ): Promise<boolean> {
    return this.store.setIfCurrent(
      K.data(org, property),
      JSON.stringify({ version, value }),
      OCCUPANCY_TTL,
      K.version(org, property),
      version,
    );
  }
  public override async invalidate(org: string, property: string): Promise<void> {
    await this.store.set(K.version(org, property), this.ids.next(), OCCUPANCY_TTL + OCCUPANCY_TTL);
    await this.store.delete(K.data(org, property));
  }
}
