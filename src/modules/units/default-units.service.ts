import { UnitLeaseDirectory } from './unit-lease-directory.contract';
import { definedFields } from './defined-fields';
import { Inject, Injectable } from '@nestjs/common';
import { UnitRepository, UnitsService, UnitPolicy, UnitEffects } from './units.contract';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import {
  UNIT_PERMISSION as P,
  UNIT_TYPE as T,
  UNIT_STATUS as S,
} from '../../shared/unit.constants';
import type { PermissionContext } from '../../shared/identity.types';
import type {
  UnitInput,
  UnitPatch,
  UnitRecord,
  UnitFilter,
  UnitPage,
  StatusInput,
  UnitConfiguration,
} from '../../shared/unit.types';
import { UnitStateMachine } from './unit-state-machine';
import { unitConfiguration, requireUnitInput, requireVacant } from './unit-schema';
import { unitWrite } from './unit-write';
@Injectable()
export class DefaultUnitsService extends UnitsService {
  public constructor(
    @Inject(UnitRepository) private readonly repo: UnitRepository,
    @Inject(UnitPolicy) private readonly policy: UnitPolicy,
    @Inject(UnitEffects) private readonly effects: UnitEffects,
    @Inject(TransactionRunner) private readonly tx: TransactionRunner,
    @Inject(UnitLeaseDirectory) private readonly leases: UnitLeaseDirectory,
  ) {
    super();
  }
  public override async create(
    actor: PermissionContext,
    property: string,
    input: UnitInput,
  ): Promise<UnitRecord> {
    await this.policy.property(actor, property, P.CREATE);
    requireUnitInput(input);
    const config = unitConfiguration(input.configuration ?? {});
    return unitWrite(
      () =>
        this.tx.run(async () => {
          const org = actor.organization.id;
          await this.repo.lockProperty(org, property);
          await this.policy.property(actor, property, P.CREATE);
          await this.policy.floor(org, property, input.floorId);
          const unit = await this.repo.create(org, property, input);
          await this.repo.setConfig(org, property, unit.id, config);
          await this.effects.changed({
            organizationId: org,
            propertyId: property,
            unitId: unit.id,
          });
          return unit;
        }),
      ErrorCode.DUPLICATE_UNIT_CODE,
    );
  }
  public override async list(actor: PermissionContext, filter: UnitFilter): Promise<UnitPage> {
    if (filter.propertyId) await this.policy.property(actor, filter.propertyId, P.READ);
    if (filter.floorId && filter.propertyId)
      await this.policy.floor(actor.organization.id, filter.propertyId, filter.floorId);
    const allowed = this.policy.allowed(actor, P.READ);
    if (allowed && !allowed.length) throw new AppException(ErrorCode.FORBIDDEN);
    return this.repo.list(actor.organization.id, filter, allowed);
  }
  public override async get(actor: PermissionContext, id: string): Promise<UnitRecord> {
    const unit = await this.record(actor, id);
    await this.policy.property(actor, unit.propertyId, P.READ);
    return unit;
  }
  public override async update(
    actor: PermissionContext,
    id: string,
    input: UnitPatch,
  ): Promise<UnitRecord> {
    const unit = await this.record(actor, id);
    await this.policy.property(actor, unit.propertyId, P.UPDATE);
    if (Object.keys(definedFields(input)).length === 0)
      throw new AppException(ErrorCode.VALIDATION_ERROR);
    await unitWrite(
      () =>
        this.tx.run(async () => {
          const org = actor.organization.id;
          await this.repo.lockProperty(org, unit.propertyId);
          await this.policy.property(actor, unit.propertyId, P.UPDATE);
          const current = await this.record(actor, id);
          requireUnitInput({
            floorId: input.floorId !== undefined ? input.floorId : current.floorId,
            code: input.code ?? current.code,
            type: input.type ?? current.type,
            baseRent: input.baseRent ?? current.baseRent,
            capacity: input.capacity ?? current.capacity,
          });
          await this.policy.floor(org, unit.propertyId, input.floorId);
          if (input.capacity !== undefined && input.capacity < (await this.repo.bedCount(org, id)))
            throw new AppException(ErrorCode.BED_CAPACITY_EXCEEDED);
          await this.validateBeds(org, id, input);
          await this.repo.update(org, id, input);
        }),
      ErrorCode.DUPLICATE_UNIT_CODE,
    );
    return this.record(actor, id);
  }
  public override async remove(actor: PermissionContext, id: string): Promise<void> {
    const unit = await this.record(actor, id);
    await this.policy.property(actor, unit.propertyId, P.DELETE);
    await this.tx.run(async () => {
      const org = actor.organization.id;
      await this.repo.lockProperty(org, unit.propertyId);
      await this.policy.property(actor, unit.propertyId, P.DELETE);
      requireVacant((await this.record(actor, id)).status);
      if (await this.repo.bedCount(org, id, true)) throw new AppException(ErrorCode.UNIT_IN_USE);
      await this.repo.remove(org, id);
      await this.effects.changed({ organizationId: org, propertyId: unit.propertyId, unitId: id });
    });
  }
  public override async status(
    actor: PermissionContext,
    id: string,
    input: StatusInput,
  ): Promise<UnitRecord> {
    const unit = await this.record(actor, id);
    await this.policy.property(actor, unit.propertyId, P.UPDATE);
    return this.tx.run(async () => {
      const org = actor.organization.id;
      await this.repo.lockProperty(org, unit.propertyId);
      await this.policy.property(actor, unit.propertyId, P.UPDATE);
      const current = await this.repo.lock(org, id);
      if (!current) throw new AppException(ErrorCode.NOT_FOUND);
      if (input.status !== S.OCCUPIED && (await this.leases.protectedTarget(org, id)))
        throw new AppException(ErrorCode.UNIT_IN_USE);
      const status = new UnitStateMachine().transition(current.status, input);
      await this.repo.setStatus(org, id, status);
      await this.effects.changed({
        organizationId: org,
        propertyId: unit.propertyId,
        unitId: id,
        previousStatus: current.status,
        status,
      });
      return { ...current, status };
    });
  }
  public override async config(actor: PermissionContext, id: string): Promise<UnitConfiguration> {
    await this.get(actor, id);
    const config = await this.repo.config(actor.organization.id, id);
    if (!config) throw new AppException(ErrorCode.NOT_FOUND);
    return config;
  }
  public override async setConfig(
    actor: PermissionContext,
    id: string,
    input: Partial<UnitConfiguration>,
  ): Promise<UnitConfiguration> {
    const unit = await this.record(actor, id);
    await this.policy.property(actor, unit.propertyId, P.UPDATE);
    return this.tx.run(async () => {
      await this.repo.lockProperty(actor.organization.id, unit.propertyId);
      await this.record(actor, id);
      await this.policy.property(actor, unit.propertyId, P.UPDATE);
      const current = await this.repo.config(actor.organization.id, id);
      const patch = definedFields(input);
      const result = unitConfiguration({ ...current, ...patch });
      await this.repo.setConfig(actor.organization.id, unit.propertyId, id, result);
      return result;
    });
  }
  private async record(actor: PermissionContext, id: string): Promise<UnitRecord> {
    const unit = await this.repo.get(actor.organization.id, id);
    if (!unit) throw new AppException(ErrorCode.NOT_FOUND);
    return unit;
  }
  private async validateBeds(org: string, id: string, input: UnitPatch): Promise<void> {
    if (input.type && input.type !== T.ROOM && (await this.repo.bedCount(org, id)))
      throw new AppException(ErrorCode.BED_NOT_SUPPORTED);
  }
}
