import { Inject, Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { BulkJobRepository } from './bulk.contract';
import { BulkJobEntity } from './bulk-job.entity';
import type { BulkPattern, BulkRecord } from '../../shared/unit.types';
@Injectable()
export class TypeOrmBulkJobRepository extends BulkJobRepository {
  public constructor(@Inject(DatabaseConnection) private readonly db: DatabaseConnection) {
    super();
  }
  public override create(
    organizationId: string,
    propertyId: string,
    requestedBy: string,
    pattern: BulkPattern,
  ): Promise<BulkRecord> {
    return this.db.withManager((m) =>
      m.getRepository(BulkJobEntity).save({ organizationId, propertyId, requestedBy, pattern }),
    );
  }
  public override get(organizationId: string, id: string): Promise<BulkRecord | null> {
    return this.db.withManager((m) =>
      m.getRepository(BulkJobEntity).findOneBy({ organizationId, id }),
    );
  }
  public override lock(organizationId: string, id: string): Promise<BulkRecord | null> {
    return this.db.withManager((m) =>
      m
        .getRepository(BulkJobEntity)
        .findOne({ where: { organizationId, id }, lock: { mode: 'pessimistic_write' } }),
    );
  }
  public override async update(
    organizationId: string,
    id: string,
    status: BulkRecord['status'],
    createdCount: number,
    errorCode?: string,
  ): Promise<void> {
    await this.db.withManager(async (m) => {
      const result = await m
        .getRepository(BulkJobEntity)
        .update(
          { organizationId, id, deletedAt: IsNull() },
          { status, createdCount, errorCode: errorCode ?? null },
        );
      if (!result.affected) throw new AppException(ErrorCode.NOT_FOUND);
    });
  }
}
