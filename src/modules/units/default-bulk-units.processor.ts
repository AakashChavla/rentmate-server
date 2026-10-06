import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { BulkUnitsJob, BulkJobRepository } from './bulk.contract';
import { BulkUnitWriter } from './units.contract';
import { PermissionContextLoader } from '../authorization';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { BULK_STATUS as S } from '../../shared/unit.constants';
const payload = z.object({ organizationId: z.uuid(), id: z.uuid() }).strict();
@Injectable()
export class DefaultBulkUnitsJob extends BulkUnitsJob {
  public constructor(
    @Inject(BulkJobRepository) private readonly jobs: BulkJobRepository,
    @Inject(BulkUnitWriter) private readonly writer: BulkUnitWriter,
    @Inject(PermissionContextLoader) private readonly contexts: PermissionContextLoader,
    @Inject(TransactionRunner) private readonly tx: TransactionRunner,
  ) {
    super();
  }
  public override async handle(jobId: string, data: unknown): Promise<void> {
    const parsed = payload.safeParse(data);
    if (!parsed.success || parsed.data.id !== jobId)
      throw new AppException(ErrorCode.VALIDATION_ERROR);
    const { organizationId: org, id } = parsed.data;
    try {
      await this.tx.run(async () => {
        const job = await this.jobs.lock(org, id);
        if (!job) throw new AppException(ErrorCode.NOT_FOUND);
        if (job.status === S.COMPLETED || job.status === S.FAILED) return;
        const actor = await this.contexts.load(org, job.requestedBy);
        await this.jobs.update(org, id, S.RUNNING, 0);
        const count = await this.writer.create(actor, job.propertyId, job.pattern);
        await this.jobs.update(org, id, S.COMPLETED, count);
      });
    } catch (error) {
      if (!(error instanceof AppException) || error.code === ErrorCode.INFRASTRUCTURE_UNAVAILABLE)
        throw error;
      await this.jobs.update(org, id, S.FAILED, 0, error.code);
    }
  }
}
