import { Inject, Injectable } from '@nestjs/common';
import { LeaseOccupancy } from './lease-occupancy.contract';
import { UnitRepository, UnitEffects } from './units.contract';
import { BedRepository } from '../beds';
import { UnitStateMachine } from './unit-state-machine';
import { UNIT_STATUS as S } from '../../shared/unit.constants';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
@Injectable()
export class DefaultLeaseOccupancy extends LeaseOccupancy {
  public constructor(
    @Inject(UnitRepository) private readonly units: UnitRepository,
    @Inject(BedRepository) private readonly beds: BedRepository,
    @Inject(UnitEffects) private readonly effects: UnitEffects,
    @Inject(TransactionRunner) private readonly tx: TransactionRunner,
  ) {
    super();
  }
  public override change(
    org: string,
    id: string,
    bed: string | null,
    occupied: boolean,
  ): Promise<void> {
    return this.tx.run(async () => {
      const unit = await this.units.get(org, id);
      if (!unit) throw new AppException(ErrorCode.NOT_FOUND);
      await this.units.lockProperty(org, unit.propertyId);
      const current = await this.units.lock(org, id);
      if (!current) throw new AppException(ErrorCode.NOT_FOUND);
      let status = occupied ? S.OCCUPIED : S.VACANT;
      if (bed) {
        const row = await this.beds.lock(org, bed);
        if (!row || row.unitId !== id) throw new AppException(ErrorCode.NOT_FOUND);
        const next = new UnitStateMachine().transition(row.status, { status });
        await this.beds.setStatus(org, bed, next);
        await this.effects.changed({
          organizationId: org,
          propertyId: unit.propertyId,
          unitId: id,
          bedId: bed,
          previousStatus: row.status,
          status: next,
        });
        const rows = await this.beds.list(org, id);
        status = rows.some((b) => b.status === S.OCCUPIED) ? S.OCCUPIED : S.VACANT;
      }
      const next = new UnitStateMachine().transition(current.status, { status });
      await this.units.setStatus(org, id, next);
      await this.effects.changed({
        organizationId: org,
        propertyId: unit.propertyId,
        unitId: id,
        previousStatus: current.status,
        status: next,
      });
    });
  }
}
