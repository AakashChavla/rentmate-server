import { Inject, Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { BedRepository } from './beds.contract';
import { BedEntity } from './bed.entity';
import type { BedRecord } from '../../shared/unit.types';
import { UNIT_STATUS as S } from '../../shared/unit.constants';
@Injectable()
export class TypeOrmBedRepository extends BedRepository {
  public constructor(@Inject(DatabaseConnection) private readonly db: DatabaseConnection) {
    super();
  }
  public override create(
    organizationId: string,
    propertyId: string,
    unitId: string,
    label: string,
  ): Promise<BedRecord> {
    return this.db.withManager((m) =>
      m.getRepository(BedEntity).save({ organizationId, propertyId, unitId, label }),
    );
  }
  public override get(organizationId: string, id: string): Promise<BedRecord | null> {
    return this.db.withManager((m) => m.getRepository(BedEntity).findOneBy({ organizationId, id }));
  }
  public override lock(organizationId: string, id: string): Promise<BedRecord | null> {
    return this.db.withManager((m) =>
      m
        .getRepository(BedEntity)
        .findOne({ where: { organizationId, id }, lock: { mode: 'pessimistic_write' } }),
    );
  }
  public override list(organizationId: string, unitId: string): Promise<BedRecord[]> {
    return this.db.withManager((m) =>
      m
        .getRepository(BedEntity)
        .find({ where: { organizationId, unitId }, order: { label: 'ASC', id: 'ASC' } }),
    );
  }
  public override async update(organizationId: string, id: string, label: string): Promise<void> {
    await this.db.withManager(async (m) => {
      const result = await m
        .getRepository(BedEntity)
        .update({ organizationId, id, deletedAt: IsNull() }, { label });
      if (!result.affected) throw new AppException(ErrorCode.NOT_FOUND);
    });
  }
  public override async remove(organizationId: string, id: string): Promise<void> {
    await this.db.withManager(async (m) => {
      const result = await m.getRepository(BedEntity).softDelete({ organizationId, id });
      if (!result.affected) throw new AppException(ErrorCode.NOT_FOUND);
    });
  }
  public override async setStatus(
    organizationId: string,
    id: string,
    status: BedRecord['status'],
  ): Promise<void> {
    await this.db.withManager(async (m) => {
      const result = await m
        .getRepository(BedEntity)
        .update({ organizationId, id, deletedAt: IsNull() }, { status });
      if (!result.affected) throw new AppException(ErrorCode.NOT_FOUND);
    });
  }
  public override counts(
    org: string,
    property: string,
  ): Promise<{ occupied: number; total: number }> {
    return this.db.withManager(async (m) => {
      const rows = await m.query<{ total: number; occupied: number }[]>(
        'SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE b.status=$3)::int AS occupied FROM beds b JOIN units u ON u.organization_id=b.organization_id AND u.id=b.unit_id AND u.deleted_at IS NULL WHERE b.organization_id=$1 AND b.property_id=$2 AND b.deleted_at IS NULL',
        [org, property, S.OCCUPIED],
      );
      return rows[0] ?? { occupied: 0, total: 0 };
    });
  }
}
