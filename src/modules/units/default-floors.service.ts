import { definedFields } from './defined-fields';
import { Inject, Injectable } from '@nestjs/common';
import { FloorsService, FloorRepository, UnitRepository, UnitPolicy } from './units.contract';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { UNIT_PERMISSION as P } from '../../shared/unit.constants';
import type { PermissionContext } from '../../shared/identity.types';
import type { FloorInput, FloorRecord } from '../../shared/unit.types';
import { unitWrite } from './unit-write';
@Injectable()
export class DefaultFloorsService extends FloorsService {
  public constructor(
    @Inject(FloorRepository) private readonly repo: FloorRepository,
    @Inject(UnitRepository) private readonly units: UnitRepository,
    @Inject(UnitPolicy) private readonly policy: UnitPolicy,
    @Inject(TransactionRunner) private readonly tx: TransactionRunner,
  ) {
    super();
  }
  public override async create(
    actor: PermissionContext,
    property: string,
    input: FloorInput,
  ): Promise<FloorRecord> {
    await this.policy.property(actor, property, P.CREATE);
    return unitWrite(() =>
      this.tx.run(async () => {
        await this.units.lockProperty(actor.organization.id, property);
        await this.policy.property(actor, property, P.CREATE);
        return this.repo.create(actor.organization.id, property, input);
      }),
    );
  }
  public override async list(actor: PermissionContext, property: string): Promise<FloorRecord[]> {
    await this.policy.property(actor, property, P.READ);
    return this.repo.list(actor.organization.id, property);
  }
  public override async get(actor: PermissionContext, id: string): Promise<FloorRecord> {
    const floor = await this.record(actor, id);
    await this.policy.property(actor, floor.propertyId, P.READ);
    return floor;
  }
  public override async update(
    actor: PermissionContext,
    id: string,
    input: Partial<FloorInput>,
  ): Promise<FloorRecord> {
    const floor = await this.record(actor, id);
    await this.policy.property(actor, floor.propertyId, P.UPDATE);
    if (Object.keys(definedFields(input)).length === 0)
      throw new AppException(ErrorCode.VALIDATION_ERROR);
    await unitWrite(() =>
      this.tx.run(async () => {
        await this.units.lockProperty(actor.organization.id, floor.propertyId);
        await this.policy.property(actor, floor.propertyId, P.UPDATE);
        await this.repo.update(actor.organization.id, id, input);
      }),
    );
    return this.record(actor, id);
  }
  public override async remove(actor: PermissionContext, id: string): Promise<void> {
    const floor = await this.record(actor, id);
    await this.policy.property(actor, floor.propertyId, P.DELETE);
    await this.tx.run(async () => {
      await this.units.lockProperty(actor.organization.id, floor.propertyId);
      await this.policy.property(actor, floor.propertyId, P.DELETE);
      if (await this.repo.hasUnits(actor.organization.id, id))
        throw new AppException(ErrorCode.UNIT_IN_USE);
      await this.repo.remove(actor.organization.id, id);
    });
  }
  private async record(actor: PermissionContext, id: string): Promise<FloorRecord> {
    const floor = await this.repo.get(actor.organization.id, id);
    if (!floor) throw new AppException(ErrorCode.NOT_FOUND);
    return floor;
  }
}
