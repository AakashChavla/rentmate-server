import { Inject, Injectable } from '@nestjs/common';
import { LeasesService, LeaseRepository, LeasePolicy, LeaseLifecycle } from './leases.contract';
import { TenantPolicy } from '../tenants';
import { UnitRepository } from '../units';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { LEASE_PERMISSION as P, LEASE_STATUS as S } from '../../shared/lease.constants';
import type { PermissionContext } from '../../shared/identity.types';
import type { LeaseInput, LeaseRecord, LeaseView, DomainFilter } from '../../shared/lease.types';
import { mapLeaseError } from './overlap-error';
import { leaseSummary } from './lease-view';
@Injectable()
export class DefaultLeasesService extends LeasesService {
  public constructor(
    @Inject(LeaseRepository) private readonly repo: LeaseRepository,
    @Inject(LeasePolicy) private readonly policy: LeasePolicy,
    @Inject(LeaseLifecycle) private readonly lifecycle: LeaseLifecycle,
    @Inject(TenantPolicy) private readonly tenants: TenantPolicy,
    @Inject(UnitRepository) private readonly units: UnitRepository,
    @Inject(TransactionRunner) private readonly tx: TransactionRunner,
  ) {
    super();
  }
  public override async create(actor: PermissionContext, input: LeaseInput): Promise<LeaseView> {
    const property = await this.policy.input(actor, input);
    return this.tx
      .run(async () => {
        await this.units.lockProperty(actor.organization.id, property);
        await this.policy.input(actor, input);
        if (await this.repo.overlap(actor.organization.id, input))
          throw new AppException(ErrorCode.LEASE_OVERLAP);
        return this.policy.view(
          actor.organization.id,
          await this.repo.create(actor.organization.id, property, input),
        );
      })
      .catch(mapLeaseError);
  }
  public override async get(actor: PermissionContext, id: string): Promise<LeaseView> {
    return this.policy.view(actor.organization.id, await this.policy.record(actor, id, P.READ));
  }
  public override list(
    actor: PermissionContext,
    filter: DomainFilter,
  ): Promise<{ items: LeaseRecord[]; nextCursor: string | null }> {
    if (filter.status && !Object.values(S).some((status) => status === filter.status))
      throw new AppException(ErrorCode.VALIDATION_ERROR);
    const own = this.tenants.ownOnly(actor);
    return this.repo
      .list(
        actor.organization.id,
        filter,
        this.tenants.allowed(actor, P.READ),
        own ? actor.user.id : undefined,
      )
      .then((page) => ({ ...page, items: page.items.map(leaseSummary) }));
  }
  public override async available(
    actor: PermissionContext,
    input: LeaseInput,
  ): Promise<{ available: boolean }> {
    await this.policy.input(actor, input);
    return { available: !(await this.repo.overlap(actor.organization.id, input)) };
  }
  public override deposit(
    actor: PermissionContext,
    id: string,
    reference: string,
  ): Promise<LeaseView> {
    return this.lifecycle.deposit(actor, id, reference);
  }
  public override renew(
    actor: PermissionContext,
    id: string,
    input: LeaseInput,
  ): Promise<LeaseView> {
    return this.lifecycle.renew(actor, id, input);
  }
  public override terminate(
    actor: PermissionContext,
    id: string,
    reason: string,
  ): Promise<LeaseView> {
    return this.lifecycle.terminate(actor, id, reason);
  }
  public override expiry(org: string, id: string, today: string): Promise<void> {
    return this.lifecycle.expiry(org, id, today);
  }
}
