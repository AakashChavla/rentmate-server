import { Inject, Injectable } from '@nestjs/common';
import {
  BulkUnitWriter,
  UnitRepository,
  FloorRepository,
  UnitPolicy,
  UnitEffects,
} from './units.contract';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import type { PermissionContext } from '../../shared/identity.types';
import type { BulkPattern, UnitInput } from '../../shared/unit.types';
import { UNIT_PERMISSION as P } from '../../shared/unit.constants';
import { bulkCode, bulkPattern } from './unit-schema';
import { unitWrite } from './unit-write';
import { ErrorCode } from '../../core/errors/error-code.constants';
@Injectable()
export class DefaultBulkUnitWriter extends BulkUnitWriter {
  public constructor(
    @Inject(UnitRepository) private readonly units: UnitRepository,
    @Inject(FloorRepository) private readonly floors: FloorRepository,
    @Inject(UnitPolicy) private readonly policy: UnitPolicy,
    @Inject(UnitEffects) private readonly effects: UnitEffects,
    @Inject(TransactionRunner) private readonly tx: TransactionRunner,
  ) {
    super();
  }
  public override async create(
    actor: PermissionContext,
    property: string,
    input: BulkPattern,
  ): Promise<number> {
    const pattern = bulkPattern(input);
    await this.policy.property(actor, property, P.CREATE);
    return unitWrite(
      () =>
        this.tx.run(async () => {
          const org = actor.organization.id;
          await this.units.lockProperty(org, property);
          await this.policy.property(actor, property, P.CREATE);
          const rows = await this.rows(org, property, pattern);
          const count = await this.units.bulk(org, property, rows);
          await this.effects.changed({ organizationId: org, propertyId: property });
          return count;
        }),
      ErrorCode.DUPLICATE_UNIT_CODE,
    );
  }
  private async rows(org: string, property: string, pattern: BulkPattern): Promise<UnitInput[]> {
    const rows: UnitInput[] = [];
    for (let offset = 0; offset < pattern.floors; offset++) {
      const level = pattern.startFloor + offset;
      const floor = await this.floors.ensure(org, property, level, pattern.wing);
      for (let index = 0; index < pattern.perFloor; index++)
        rows.push({
          floorId: floor.id,
          code: bulkCode(pattern.prefix, level, pattern.startNumber + index),
          type: pattern.type,
          baseRent: pattern.baseRent,
          capacity: pattern.capacity,
        });
    }
    return rows;
  }
}
