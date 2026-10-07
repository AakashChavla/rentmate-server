import { UnitLeaseDirectory } from '../units';
import { Inject, Injectable } from '@nestjs/common';
import { BedsService, BedRepository } from './beds.contract';
import { UnitRepository, UnitPolicy, UnitEffects, UnitStateMachine } from '../units';
import { PropertyRepository } from '../properties';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { PROPERTY_TYPE } from '../../shared/property.constants';
import {
  UNIT_PERMISSION as P,
  UNIT_TYPE as T,
  UNIT_STATUS as S,
} from '../../shared/unit.constants';
import type { PermissionContext } from '../../shared/identity.types';
import type { BedRecord, UnitRecord, StatusInput } from '../../shared/unit.types';
import { isUniqueViolation } from '../../core/database/database-errors';
@Injectable()
export class DefaultBedsService extends BedsService {
  public constructor(
    @Inject(BedRepository) private readonly repo: BedRepository,
    @Inject(UnitRepository) private readonly units: UnitRepository,
    @Inject(UnitPolicy) private readonly policy: UnitPolicy,
    @Inject(UnitEffects) private readonly effects: UnitEffects,
    @Inject(PropertyRepository) private readonly properties: PropertyRepository,
    @Inject(TransactionRunner) private readonly tx: TransactionRunner,
    @Inject(UnitLeaseDirectory) private readonly leases: UnitLeaseDirectory,
  ) {
    super();
  }
  public override async create(
    actor: PermissionContext,
    id: string,
    label: string,
  ): Promise<BedRecord> {
    const unit = await this.unit(actor, id, P.CREATE);
    return this.write(() =>
      this.tx.run(async () => {
        const org = actor.organization.id;
        await this.units.lockProperty(org, unit.propertyId);
        const current = await this.unit(actor, id, P.CREATE);
        if ((await this.units.bedCount(org, id)) >= current.capacity)
          throw new AppException(ErrorCode.BED_CAPACITY_EXCEEDED);
        const bed = await this.repo.create(org, unit.propertyId, id, label);
        await this.effects.changed({
          organizationId: org,
          propertyId: unit.propertyId,
          unitId: id,
          bedId: bed.id,
        });
        return bed;
      }),
    );
  }
  public override async list(actor: PermissionContext, id: string): Promise<BedRecord[]> {
    await this.unit(actor, id, P.READ);
    return this.repo.list(actor.organization.id, id);
  }
  public override async get(actor: PermissionContext, id: string): Promise<BedRecord> {
    const bed = await this.record(actor, id);
    await this.unit(actor, bed.unitId, P.READ);
    return bed;
  }
  public override async update(
    actor: PermissionContext,
    id: string,
    label: string,
  ): Promise<BedRecord> {
    const bed = await this.record(actor, id);
    await this.unit(actor, bed.unitId, P.UPDATE);
    await this.write(() =>
      this.tx.run(async () => {
        await this.units.lockProperty(actor.organization.id, bed.propertyId);
        await this.unit(actor, bed.unitId, P.UPDATE);
        await this.repo.update(actor.organization.id, id, label);
      }),
    );
    return this.record(actor, id);
  }
  public override async remove(actor: PermissionContext, id: string): Promise<void> {
    const bed = await this.record(actor, id);
    await this.unit(actor, bed.unitId, P.DELETE);
    await this.tx.run(async () => {
      const org = actor.organization.id;
      await this.units.lockProperty(org, bed.propertyId);
      await this.unit(actor, bed.unitId, P.DELETE);
      const current = await this.record(actor, id);
      if (await this.leases.protectedTarget(org, current.unitId, id))
        throw new AppException(ErrorCode.UNIT_IN_USE);
      if (current.status === S.OCCUPIED || current.status === S.RESERVED)
        throw new AppException(ErrorCode.UNIT_IN_USE);
      await this.repo.remove(org, id);
      await this.effects.changed({ organizationId: org, propertyId: bed.propertyId, bedId: id });
    });
  }
  public override async status(
    actor: PermissionContext,
    id: string,
    input: StatusInput,
  ): Promise<BedRecord> {
    const bed = await this.record(actor, id);
    await this.unit(actor, bed.unitId, P.UPDATE);
    return this.tx.run(async () => {
      const org = actor.organization.id;
      await this.units.lockProperty(org, bed.propertyId);
      await this.unit(actor, bed.unitId, P.UPDATE);
      const current = await this.repo.lock(org, id);
      if (!current) throw new AppException(ErrorCode.NOT_FOUND);
      if (
        input.status !== S.OCCUPIED &&
        (await this.leases.protectedTarget(org, current.unitId, id))
      )
        throw new AppException(ErrorCode.UNIT_IN_USE);
      const status = new UnitStateMachine().transition(current.status, input);
      await this.repo.setStatus(org, id, status);
      await this.effects.changed({
        organizationId: org,
        propertyId: bed.propertyId,
        unitId: bed.unitId,
        bedId: id,
        previousStatus: current.status,
        status,
      });
      return { ...current, status };
    });
  }
  private async record(actor: PermissionContext, id: string): Promise<BedRecord> {
    const bed = await this.repo.get(actor.organization.id, id);
    if (!bed) throw new AppException(ErrorCode.NOT_FOUND);
    return bed;
  }
  private async unit(
    actor: PermissionContext,
    id: string,
    permission: string,
  ): Promise<UnitRecord> {
    const unit = await this.units.get(actor.organization.id, id);
    if (!unit) throw new AppException(ErrorCode.NOT_FOUND);
    await this.policy.property(actor, unit.propertyId, permission);
    const property = await this.properties.get(actor.organization.id, unit.propertyId);
    if (property?.type !== PROPERTY_TYPE.PG || unit.type !== T.ROOM)
      throw new AppException(ErrorCode.BED_NOT_SUPPORTED);
    return unit;
  }
  private async write<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (isUniqueViolation(error)) throw new AppException(ErrorCode.CONFLICT);
      throw error;
    }
  }
}
