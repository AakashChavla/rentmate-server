import { Inject, Injectable } from '@nestjs/common';
import { BulkUnitsService, BulkJobRepository } from './bulk.contract';
import { BulkUnitWriter, UnitPolicy } from './units.contract';
import { QueuePublisher } from '../../core/queue/queue-publisher.contract';
import { QUEUE_NAMES } from '../../core/config/config.constants';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import type { PermissionContext } from '../../shared/identity.types';
import type { BulkPattern, BulkResult, BulkRecord } from '../../shared/unit.types';
import {
  BULK_SYNC_LIMIT,
  BULK_MODE as M,
  BULK_STATUS as S,
  UNIT_PERMISSION as P,
} from '../../shared/unit.constants';
import { bulkPattern } from './unit-schema';
@Injectable()
export class DefaultBulkUnitsService extends BulkUnitsService {
  public constructor(
    @Inject(BulkJobRepository) private readonly jobs: BulkJobRepository,
    @Inject(BulkUnitWriter) private readonly writer: BulkUnitWriter,
    @Inject(UnitPolicy) private readonly policy: UnitPolicy,
    @Inject(QueuePublisher) private readonly queue: QueuePublisher,
    @Inject(TransactionRunner) private readonly tx: TransactionRunner,
  ) {
    super();
  }
  public override async create(
    actor: PermissionContext,
    property: string,
    input: BulkPattern,
  ): Promise<BulkResult> {
    const pattern = bulkPattern(input);
    await this.policy.property(actor, property, P.CREATE);
    if (pattern.floors * pattern.perFloor <= BULK_SYNC_LIMIT) {
      const count = await this.writer.create(actor, property, pattern);
      return { mode: M.SYNC, createdCount: count, jobId: null, status: S.COMPLETED };
    }
    return this.tx.run(async () => {
      const job = await this.jobs.create(actor.organization.id, property, actor.user.id, pattern);
      await this.tx.afterCommit(() =>
        this.queue.publish(QUEUE_NAMES.UNITS_BULK, job.id, {
          organizationId: job.organizationId,
          id: job.id,
        }),
      );
      return { mode: M.QUEUED, createdCount: 0, jobId: job.id, status: S.PENDING };
    });
  }
  public override async get(
    actor: PermissionContext,
    property: string,
    id: string,
  ): Promise<BulkRecord> {
    await this.policy.property(actor, property, P.CREATE);
    const job = await this.jobs.get(actor.organization.id, id);
    if (job?.propertyId !== property) throw new AppException(ErrorCode.NOT_FOUND);
    return job;
  }
}
