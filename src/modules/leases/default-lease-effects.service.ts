import { Inject, Injectable } from '@nestjs/common';
import { LeaseEffects, LeaseRepository } from './leases.contract';
import { LeaseOccupancy } from '../units';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { EventBus } from '../../core/events/event-bus.contract';
import { LEASE_STATUS as S, LEASE_EVENT as E } from '../../shared/lease.constants';
import type { LeaseChange } from '../../shared/lease.types';
@Injectable()
export class DefaultLeaseEffects extends LeaseEffects {
  public constructor(
    @Inject(LeaseRepository) private readonly repo: LeaseRepository,
    @Inject(LeaseOccupancy) private readonly occupancy: LeaseOccupancy,
    @Inject(TransactionRunner) private readonly tx: TransactionRunner,
    @Inject(EventBus) private readonly events: EventBus,
  ) {
    super();
  }
  public override async changed(c: LeaseChange): Promise<void> {
    const occupied = await this.repo.occupied(c.organizationId, c.unitId, c.bedId);
    await this.occupancy.change(c.organizationId, c.unitId, c.bedId, occupied);
    const event =
      c.status === S.ACTIVE
        ? E.ACTIVATED
        : c.status === S.TERMINATED
          ? E.TERMINATED
          : c.status === S.RENEWED
            ? E.RENEWED
            : E.EXPIRED;
    await this.tx.afterCommit(() => {
      this.events.publish(event, c);
      return Promise.resolve();
    });
  }
}
