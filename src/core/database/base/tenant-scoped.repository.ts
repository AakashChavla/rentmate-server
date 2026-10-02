import { DataSource, EntityTarget, Repository } from 'typeorm';
import { TenantBaseEntity } from './tenant-base.entity';
import { TenantContext } from '../../tenancy/tenant-context';
import { TenantScopeError } from '../../tenancy/tenant-scope.error';
import { TransactionRunner } from '../transaction-runner';

export abstract class TenantScopedRepository<T extends TenantBaseEntity> {
  constructor(
    protected readonly target: EntityTarget<T>,
    protected readonly dataSource: DataSource,
  ) {}

  protected get repo(): Repository<T> {
    const ambientManager = TransactionRunner.getAmbientManager();
    if (ambientManager) {
      return ambientManager.getRepository(this.target);
    }
    return this.dataSource.getRepository(this.target);
  }

  protected getOrgId(overrideOrgId?: string): string {
    const orgId = overrideOrgId || TenantContext.getOrganizationId();
    if (!orgId) {
      throw new TenantScopeError('Tenant context missing organization_id');
    }
    return orgId;
  }
}
