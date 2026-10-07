import { LeaseSweep } from './lease-sweep.contract';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { Inject, Injectable } from '@nestjs/common';
import { LeaseExpiryJob, LeaseRepository, LeasesService } from './leases.contract';
import { Clock } from '../../core/time/clock.contract';
import { LEASE_LIMIT as L, STORAGE_LIMIT as B } from '../../shared/lease.constants';
@Injectable()
export class DefaultLeaseExpiryJob extends LeaseExpiryJob {
  public constructor(
    @Inject(LeaseRepository) private readonly repo: LeaseRepository,
    @Inject(LeasesService) private readonly leases: LeasesService,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(LeaseSweep) private readonly sweep: LeaseSweep,
    @Inject(TransactionRunner) private readonly tx: TransactionRunner,
  ) {
    super();
  }
  public override handle(_id: string, _data: unknown): Promise<void> {
    return this.tx.run(() => this.sweepOnce());
  }
  private async sweepOnce(): Promise<void> {
    if (!(await this.sweep.tryLock())) return;
    const date = this.clock.now(),
      today = date.toISOString().slice(0, B.DATE_LENGTH),
      before = new Date(date.getTime() + L.EXPIRING_DAYS * L.DAY_MS)
        .toISOString()
        .slice(0, B.DATE_LENGTH);
    const rows = await this.repo.due(today, before);
    for (const row of rows) await this.leases.expiry(row.organizationId, row.id, today);
  }
}
