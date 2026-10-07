import { Inject, Injectable } from '@nestjs/common';
import { LeaseLifecycle, LeaseRepository, LeasePolicy, LeaseEffects } from './leases.contract';
import { UnitRepository } from '../units';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { Clock } from '../../core/time/clock.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import {
  LEASE_STATUS as S,
  LEASE_PERMISSION as P,
  LEASE_TERMINAL,
  LEASE_LIMIT as L,
} from '../../shared/lease.constants';
import type { PermissionContext } from '../../shared/identity.types';
import type { LeaseInput, LeaseRecord, LeaseView, LeaseStatus } from '../../shared/lease.types';
import { LeaseStateMachine } from './lease-state-machine';
import { mapLeaseError } from './overlap-error';
@Injectable()
export class DefaultLeaseLifecycle extends LeaseLifecycle {
  public constructor(
    @Inject(LeaseRepository) private readonly repo: LeaseRepository,
    @Inject(LeasePolicy) private readonly policy: LeasePolicy,
    @Inject(LeaseEffects) private readonly effects: LeaseEffects,
    @Inject(UnitRepository) private readonly units: UnitRepository,
    @Inject(TransactionRunner) private readonly tx: TransactionRunner,
    @Inject(Clock) private readonly clock: Clock,
  ) {
    super();
  }
  public override deposit(
    actor: PermissionContext,
    id: string,
    reference: string,
  ): Promise<LeaseView> {
    return this.tx.run(async () => {
      const row = await this.lock(actor, id);
      if (row.depositRecordedAt) {
        if (row.depositReference !== reference) throw new AppException(ErrorCode.CONFLICT);
        return this.policy.view(actor.organization.id, row);
      }
      await this.transition(row, S.ACTIVE, {
        depositRecordedAt: this.clock.now(),
        depositReference: reference,
      });
      return this.policy.view(actor.organization.id, {
        ...row,
        status: S.ACTIVE,
        depositRecordedAt: this.clock.now(),
        depositReference: reference,
      });
    });
  }
  public override renew(
    actor: PermissionContext,
    id: string,
    input: LeaseInput,
  ): Promise<LeaseView> {
    return this.tx
      .run(async () => {
        const row = await this.lock(actor, id);
        await this.policy.input(actor, input);
        if (
          input.tenantId !== row.tenantId ||
          input.unitId !== row.unitId ||
          (input.bedId ?? null) !== row.bedId ||
          input.startDate !== row.endDate
        )
          throw new AppException(ErrorCode.VALIDATION_ERROR);
        new LeaseStateMachine().transition(row.status, S.RENEWED);
        if (row.status === S.RENEWED || (await this.repo.overlap(actor.organization.id, input)))
          throw new AppException(ErrorCode.LEASE_OVERLAP);
        const next = await this.repo.create(actor.organization.id, row.propertyId, input, row.id);
        await this.transition(row, S.RENEWED, {});
        return this.policy.view(actor.organization.id, next);
      })
      .catch(mapLeaseError);
  }
  public override terminate(
    actor: PermissionContext,
    id: string,
    reason: string,
  ): Promise<LeaseView> {
    return this.tx.run(async () => {
      const row = await this.lock(actor, id);
      await this.transition(row, S.TERMINATED, {
        terminatedAt: this.clock.now(),
        terminateReason: reason,
      });
      return this.policy.view(actor.organization.id, {
        ...row,
        status: S.TERMINATED,
        terminatedAt: this.clock.now(),
        terminateReason: reason,
      });
    });
  }
  public override expiry(org: string, id: string, today: string): Promise<void> {
    return this.tx.run(async () => {
      const found = await this.repo.get(org, id);
      if (!found) return;
      await this.units.lockProperty(org, found.propertyId);
      const row = await this.repo.lock(org, id);
      if (!row || LEASE_TERMINAL.includes(row.status)) return;
      if (row.endDate <= today) {
        await this.transition(row, S.EXPIRED, {});
        return;
      }
      const soon = new Date(today).getTime() + L.EXPIRING_DAYS * L.DAY_MS;
      if (row.status === S.ACTIVE && new Date(row.endDate).getTime() <= soon)
        await this.repo.transition(
          org,
          id,
          new LeaseStateMachine().transition(row.status, S.EXPIRING),
          {},
        );
    });
  }
  private async lock(actor: PermissionContext, id: string): Promise<LeaseRecord> {
    const row = await this.policy.record(actor, id, P.UPDATE);
    await this.units.lockProperty(actor.organization.id, row.propertyId);
    await this.policy.record(actor, id, P.UPDATE);
    const current = await this.repo.lock(actor.organization.id, id);
    if (!current) throw new AppException(ErrorCode.NOT_FOUND);
    return current;
  }
  private async transition(
    row: LeaseRecord,
    status: LeaseStatus,
    fields: Partial<
      Pick<
        LeaseRecord,
        'terminatedAt' | 'terminateReason' | 'depositRecordedAt' | 'depositReference'
      >
    >,
  ): Promise<void> {
    new LeaseStateMachine().transition(row.status, status);
    await this.repo.transition(row.organizationId, row.id, status, fields);
    await this.effects.changed({
      organizationId: row.organizationId,
      propertyId: row.propertyId,
      leaseId: row.id,
      unitId: row.unitId,
      bedId: row.bedId,
      status,
    });
  }
}
