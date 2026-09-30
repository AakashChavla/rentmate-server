import type {
  DeepPartial,
  DeleteResult,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  ObjectLiteral,
  QueryDeepPartialEntity,
  Repository,
  SelectQueryBuilder,
  UpdateResult,
} from 'typeorm';
import type { TenantBaseEntity } from './tenant-base.entity';
import { TenantScopeMissingError } from './tenant-scope.error';

const ALIAS_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Every read and write is scoped with `organization_id = :organizationId`.
 * Pass the id from `TenantContext.getOrganizationId()` after the JWT guard
 * has verified it. Do not pass an organization id from the request body or params.
 */
export class TenantRepository<T extends TenantBaseEntity & ObjectLiteral> {
  constructor(private readonly repository: Repository<T>) {}

  find(organizationId: string, options: FindManyOptions<T> = {}): Promise<T[]> {
    const orgId = this.requireOrganizationId(organizationId);
    return this.repository.find({
      ...options,
      where: this.mergeWhere(orgId, options.where),
    });
  }

  findOne(organizationId: string, options: FindOneOptions<T> = {}): Promise<T | null> {
    const orgId = this.requireOrganizationId(organizationId);
    return this.repository.findOne({
      ...options,
      where: this.mergeWhere(orgId, options.where),
    });
  }

  findAndCount(organizationId: string, options: FindManyOptions<T> = {}): Promise<[T[], number]> {
    const orgId = this.requireOrganizationId(organizationId);
    return this.repository.findAndCount({
      ...options,
      where: this.mergeWhere(orgId, options.where),
    });
  }

  count(organizationId: string, options: FindManyOptions<T> = {}): Promise<number> {
    const orgId = this.requireOrganizationId(organizationId);
    return this.repository.count({
      ...options,
      where: this.mergeWhere(orgId, options.where),
    });
  }

  exists(organizationId: string, options: FindManyOptions<T> = {}): Promise<boolean> {
    const orgId = this.requireOrganizationId(organizationId);
    return this.repository.exists({
      ...options,
      where: this.mergeWhere(orgId, options.where),
    });
  }

  create(organizationId: string, entityLike: DeepPartial<T>): T {
    const orgId = this.requireOrganizationId(organizationId);
    return this.repository.create(this.stampOrganization(orgId, entityLike));
  }

  save(organizationId: string, entityLike: DeepPartial<T>): Promise<T> {
    const orgId = this.requireOrganizationId(organizationId);
    return this.repository.save(this.stampOrganization(orgId, entityLike));
  }

  update(
    organizationId: string,
    criteria: FindOptionsWhere<T>,
    partial: QueryDeepPartialEntity<T>,
  ): Promise<UpdateResult> {
    const orgId = this.requireOrganizationId(organizationId);
    return this.repository.update(this.mergeClause(orgId, criteria), partial);
  }

  delete(organizationId: string, criteria: FindOptionsWhere<T>): Promise<DeleteResult> {
    const orgId = this.requireOrganizationId(organizationId);
    return this.repository.delete(this.mergeClause(orgId, criteria));
  }

  softDelete(organizationId: string, criteria: FindOptionsWhere<T>): Promise<UpdateResult> {
    const orgId = this.requireOrganizationId(organizationId);
    return this.repository.softDelete(this.mergeClause(orgId, criteria));
  }

  scopedQueryBuilder(organizationId: string, alias: string): SelectQueryBuilder<T> {
    const orgId = this.requireOrganizationId(organizationId);
    if (!ALIAS_PATTERN.test(alias)) {
      throw new Error('Query alias must be a plain identifier');
    }

    return this.repository
      .createQueryBuilder(alias)
      .andWhere(`${alias}.organizationId = :organizationId`, { organizationId: orgId });
  }

  private requireOrganizationId(organizationId: string | undefined | null): string {
    if (typeof organizationId !== 'string' || organizationId.trim() === '') {
      throw new TenantScopeMissingError();
    }

    return organizationId;
  }

  private mergeWhere(
    organizationId: string,
    where?: FindOptionsWhere<T> | FindOptionsWhere<T>[],
  ): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
    if (Array.isArray(where)) {
      if (where.length === 0) {
        return { organizationId } as FindOptionsWhere<T>;
      }

      return where.map((clause) => ({ ...clause, organizationId }) as FindOptionsWhere<T>);
    }

    return { ...(where ?? {}), organizationId } as FindOptionsWhere<T>;
  }

  private mergeClause(organizationId: string, where: FindOptionsWhere<T>): FindOptionsWhere<T> {
    return { ...where, organizationId };
  }

  private stampOrganization(organizationId: string, entityLike: DeepPartial<T>): DeepPartial<T> {
    return { ...entityLike, organizationId };
  }
}
