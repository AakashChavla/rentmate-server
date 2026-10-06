import { Inject, Injectable } from '@nestjs/common';
import { UnitEffects } from './units.contract';
import { OccupancyStore } from '../occupancy';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { EventBus } from '../../core/events/event-bus.contract';
import { UNIT_EVENT } from '../../shared/unit.constants';
import type { UnitChange } from '../../shared/unit.types';
@Injectable()
export class DefaultUnitEffects extends UnitEffects {
  public constructor(
    @Inject(TransactionRunner) private readonly tx: TransactionRunner,
    @Inject(OccupancyStore) private readonly cache: OccupancyStore,
    @Inject(EventBus) private readonly events: EventBus,
  ) {
    super();
  }
  public override changed(change: UnitChange): Promise<void> {
    return this.tx.afterCommit(async () => {
      await this.cache.invalidate(change.organizationId, change.propertyId);
      this.events.publish(
        change.status ? UNIT_EVENT.STATUS_CHANGED : UNIT_EVENT.STRUCTURE_CHANGED,
        change,
      );
    });
  }
}
