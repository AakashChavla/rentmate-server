import { Inject, Injectable } from '@nestjs/common';
import { LeasePolicy, LeaseRepository } from './leases.contract';
import { TenantPolicy } from '../tenants';
import { UnitRepository } from '../units';
import { BedRepository } from '../beds';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { TENANT_STATUS as T, LEASE_PERMISSION as P } from '../../shared/lease.constants';
import { UNIT_STATUS as U } from '../../shared/unit.constants';
import type { PermissionContext } from '../../shared/identity.types';
import type { LeaseInput, LeaseRecord, LeaseView } from '../../shared/lease.types';
import { requireLease } from './lease-validation';
import { leaseSummary } from './lease-view';
@Injectable()
export class DefaultLeasePolicy extends LeasePolicy {
  public constructor(
    @Inject(LeaseRepository) private readonly repo: LeaseRepository,
    @Inject(TenantPolicy) private readonly tenants: TenantPolicy,
    @Inject(UnitRepository) private readonly units: UnitRepository,
    @Inject(BedRepository) private readonly beds: BedRepository,
  ) {
    super();
  }
  public override async input(actor: PermissionContext, input: LeaseInput): Promise<string> {
    requireLease(input);
    const org = actor.organization.id;
    const unit = await this.units.get(org, input.unitId);
    if (!unit) throw new AppException(ErrorCode.NOT_FOUND);
    await this.tenants.property(actor, unit.propertyId, P.CREATE);
    const tenant = await this.tenants.get(actor, input.tenantId, P.CREATE);
    if (tenant.propertyId !== unit.propertyId) throw new AppException(ErrorCode.NOT_FOUND);
    if (tenant.status !== T.VERIFIED) throw new AppException(ErrorCode.TENANT_KYC_REQUIRED);
    if ((input.members?.length ?? 0) + 1 > unit.capacity)
      throw new AppException(ErrorCode.VALIDATION_ERROR);
    const status = await this.targetStatus(org, input, unit.status);
    if (status === U.MAINTENANCE || status === U.BLOCKED)
      throw new AppException(ErrorCode.UNIT_IN_USE);
    return unit.propertyId;
  }
  private async targetStatus(org: string, input: LeaseInput, status: string): Promise<string> {
    if (!input.bedId) return status;
    const bed = await this.beds.get(org, input.bedId);
    if (!bed || bed.unitId !== input.unitId) throw new AppException(ErrorCode.NOT_FOUND);
    if (input.members?.length) throw new AppException(ErrorCode.VALIDATION_ERROR);
    return bed.status;
  }
  public override async record(
    actor: PermissionContext,
    id: string,
    permission: string,
  ): Promise<LeaseRecord> {
    const row = await this.repo.get(actor.organization.id, id);
    if (!row) throw new AppException(ErrorCode.NOT_FOUND);
    await this.tenants.get(actor, row.tenantId, permission);
    if (permission !== P.READ) await this.tenants.property(actor, row.propertyId, permission);
    return row;
  }
  public override async view(org: string, row: LeaseRecord): Promise<LeaseView> {
    return { ...leaseSummary(row), members: await this.repo.members(org, row.id) };
  }
}
