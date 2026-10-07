import { Inject, Injectable } from '@nestjs/common';
import { TenantPolicy, TenantRepository } from './tenants.contract';
import { UnitPolicy } from '../units';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { ROLE } from '../../shared/identity.constants';
import { TENANT_PERMISSION as P } from '../../shared/lease.constants';
import type { PermissionContext } from '../../shared/identity.types';
import type { TenantRecord } from '../../shared/lease.types';
@Injectable()
export class DefaultTenantPolicy extends TenantPolicy {
  public constructor(
    @Inject(TenantRepository) private readonly repo: TenantRepository,
    @Inject(UnitPolicy) private readonly policy: UnitPolicy,
  ) {
    super();
  }
  public override ownOnly(actor: PermissionContext): boolean {
    return actor.roles.some((r) => r.role === ROLE.TENANT);
  }
  public override async get(
    actor: PermissionContext,
    id: string,
    permission: string,
  ): Promise<TenantRecord> {
    const row = await this.repo.get(actor.organization.id, id);
    if (!row) throw new AppException(ErrorCode.NOT_FOUND);
    if (this.ownOnly(actor)) {
      if (row.userId !== actor.user.id) throw new AppException(ErrorCode.NOT_FOUND);
      await this.policy.property(
        actor,
        row.propertyId,
        permission === P.UPDATE ? P.READ : permission,
      );
    } else await this.property(actor, row.propertyId, permission);
    return row;
  }
  public override property(
    actor: PermissionContext,
    id: string,
    permission: string,
  ): Promise<void> {
    if (this.ownOnly(actor)) throw new AppException(ErrorCode.FORBIDDEN);
    return this.policy.property(actor, id, permission);
  }
  public override allowed(actor: PermissionContext, permission: string): string[] | undefined {
    return this.policy.allowed(actor, permission);
  }
}
