import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OccupancyReadModel, OccupancyStore } from './occupancy.contract';
import { UnitRepository, UnitPolicy } from '../units';
import { BedRepository } from '../beds';
import type { PermissionContext } from '../../shared/identity.types';
import type { OccupancySnapshot, OccupancyCount, UnitChange } from '../../shared/unit.types';
import { UNIT_PERMISSION, UNIT_EVENT, UNIT_LIMITS as L } from '../../shared/unit.constants';
@Injectable()
export class DefaultOccupancyReadModel extends OccupancyReadModel {
  public constructor(
    @Inject(UnitRepository) private readonly units: UnitRepository,
    @Inject(BedRepository) private readonly beds: BedRepository,
    @Inject(UnitPolicy) private readonly policy: UnitPolicy,
    @Inject(OccupancyStore) private readonly cache: OccupancyStore,
  ) {
    super();
  }
  public override async get(
    actor: PermissionContext,
    property: string,
  ): Promise<OccupancySnapshot> {
    await this.policy.property(actor, property, UNIT_PERMISSION.READ);
    const org = actor.organization.id;
    const version = await this.cache.version(org, property);
    const cached = await this.cache.get(org, property);
    if (cached) return cached;
    const [units, beds] = await Promise.all([
      this.units.counts(org, property),
      this.beds.counts(org, property),
    ]);
    const value = { units: this.percent(units), beds: this.percent(beds) };
    await this.cache.set(org, property, value, version);
    return value;
  }
  private percent(count: { occupied: number; total: number }): OccupancyCount {
    return {
      ...count,
      percent: count.total
        ? Math.round((count.occupied / count.total) * L.PERCENT * L.PRECISION) / L.PRECISION
        : 0,
    };
  }
  @OnEvent(UNIT_EVENT.STATUS_CHANGED) public changed(change: UnitChange): Promise<void> {
    return this.cache.invalidate(change.organizationId, change.propertyId);
  }
}
