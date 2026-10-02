import {
  DataSource,
  DeepPartial,
  EntityTarget,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  ObjectLiteral,
  QueryDeepPartialEntity,
  Repository,
  SelectQueryBuilder,
  UpdateResult,
} from 'typeorm';
import { TenantBaseEntity } from './tenant-base.entity';
import { TenantRepository } from './tenant.repository';
import { TenantContext } from '../../tenancy/tenant-context';
import { TenantScopeError } from '../../tenancy/tenant-scope.error';
import { TransactionRunner } from '../transaction-runner';

export abstract class TenantScopedRepository<T extends TenantBaseEntity & ObjectLiteral> {
  constructor(
    protected readonly target: EntityTarget<T>,
    protected readonly dataSource: DataSource,
  ) {}

  /**
   * Escape hatch for explicitly allow-listed unscoped auth queries:
   * 1. UserRepository.findByEmailForAuth
   * 2. RefreshTokenRepository.findByJti
   */
  protected get unscopedForAuth(): Repository<T> {
    const ambientManager = TransactionRunner.getAmbientManager();
    if (ambientManager) {
      return ambientManager.getRepository(this.target);
    }
    return this.dataSource.getRepository(this.target);
  }

  private get tenantRepo(): TenantRepository<T> {
    return new TenantRepository<T>(this.unscopedForAuth);
  }

  protected getOrgId(overrideOrgId?: string): string {
    const orgId = overrideOrgId || TenantContext.getOrganizationId();
    if (!orgId) {
      throw new TenantScopeError('Tenant context missing organization_id');
    }
    return orgId;
  }

  protected findOneScoped(
    organizationId: string,
    options: FindOneOptions<T> = {},
  ): Promise<T | null> {
    return this.tenantRepo.findOne(organizationId, options);
  }

  protected listScoped(organizationId: string, options: FindManyOptions<T> = {}): Promise<T[]> {
    return this.tenantRepo.find(organizationId, options);
  }

  protected saveScoped(organizationId: string, entityLike: DeepPartial<T>): Promise<T> {
    return this.tenantRepo.save(organizationId, entityLike);
  }

  protected updateScoped(
    organizationId: string,
    criteria: FindOptionsWhere<T>,
    partial: QueryDeepPartialEntity<T>,
  ): Promise<UpdateResult> {
    return this.tenantRepo.update(organizationId, criteria, partial);
  }

  protected softDeleteScoped(
    organizationId: string,
    criteria: FindOptionsWhere<T>,
  ): Promise<UpdateResult> {
    return this.tenantRepo.softDelete(organizationId, criteria);
  }

  protected scopedQueryBuilder(organizationId: string, alias: string): SelectQueryBuilder<T> {
    return this.tenantRepo.scopedQueryBuilder(organizationId, alias);
  }
}
