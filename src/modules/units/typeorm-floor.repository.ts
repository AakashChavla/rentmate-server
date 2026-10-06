import { Inject, Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { FloorRepository } from './units.contract';
import { FloorEntity } from './floor.entity';
import { UnitEntity } from './unit.entity';
import type { FloorInput, FloorRecord } from '../../shared/unit.types';
@Injectable()
export class TypeOrmFloorRepository extends FloorRepository {
  public constructor(@Inject(DatabaseConnection) private readonly db: DatabaseConnection) {
    super();
  }
  public override create(
    organizationId: string,
    propertyId: string,
    input: FloorInput,
  ): Promise<FloorRecord> {
    return this.db.withManager((m) =>
      m.getRepository(FloorEntity).save({ organizationId, propertyId, ...input }),
    );
  }
  public override get(organizationId: string, id: string): Promise<FloorRecord | null> {
    return this.db.withManager((m) =>
      m.getRepository(FloorEntity).findOneBy({ organizationId, id }),
    );
  }
  public override list(organizationId: string, propertyId: string): Promise<FloorRecord[]> {
    return this.db.withManager((m) =>
      m.getRepository(FloorEntity).find({
        where: { organizationId, propertyId },
        order: { wing: 'ASC', level: 'ASC', id: 'ASC' },
      }),
    );
  }
  public override async update(
    organizationId: string,
    id: string,
    input: Partial<FloorInput>,
  ): Promise<void> {
    await this.db.withManager(async (m) => {
      const result = await m
        .getRepository(FloorEntity)
        .update({ organizationId, id, deletedAt: IsNull() }, input);
      if (!result.affected) throw new AppException(ErrorCode.NOT_FOUND);
    });
  }
  public override async remove(organizationId: string, id: string): Promise<void> {
    await this.db.withManager(async (m) => {
      const result = await m.getRepository(FloorEntity).softDelete({ organizationId, id });
      if (!result.affected) throw new AppException(ErrorCode.NOT_FOUND);
    });
  }
  public override hasUnits(organizationId: string, floorId: string): Promise<boolean> {
    return this.db.withManager((m) =>
      m.getRepository(UnitEntity).existsBy({ organizationId, floorId }),
    );
  }
  public override async ensure(
    organizationId: string,
    propertyId: string,
    level: number,
    wing: string,
  ): Promise<FloorRecord> {
    return this.db.withManager(async (m) => {
      const repo = m.getRepository(FloorEntity);
      const existing = await repo.findOneBy({ organizationId, propertyId, level, wing });
      if (existing) return existing;
      return this.create(organizationId, propertyId, { name: String(level), level, wing });
    });
  }
}
