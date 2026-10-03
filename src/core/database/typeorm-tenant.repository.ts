import { IsNull, type EntityTarget, type FindOptionsWhere, type ObjectLiteral } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { DatabaseConnection } from './database-connection.contract';
import {
  TenantRepository,
  type TenantRecord,
  type TenantInsert,
  type TenantUpdate,
} from './tenant-repository.contract';
import { AppException } from '../errors/app-exception';
import { ErrorCode } from '../errors/error-code.constants';
import { IdGenerator } from '../ids/id-generator.contract';
export class TypeOrmTenantRepository<
  T extends TenantRecord & ObjectLiteral,
> extends TenantRepository<T> {
  public constructor(
    private readonly database: DatabaseConnection,
    private readonly entity: EntityTarget<T>,
    private readonly ids: IdGenerator,
  ) {
    super();
  }
  public override findByIdInOrg(organizationId: string, id: string): Promise<T | null> {
    requireScope(organizationId);
    return this.database.withManager((manager) =>
      manager
        .getRepository(this.entity)
        .findOneBy({ id, organizationId, deletedAt: IsNull() } as unknown as FindOptionsWhere<T>),
    );
  }
  public override async insertInOrg(
    organizationId: string,
    data: TenantInsert<T>,
  ): Promise<string> {
    requireScope(organizationId);
    const safe = Object.fromEntries(
      Object.entries(data).filter(([key]) => !PROTECTED_COLUMNS.has(key)),
    );
    const id = this.ids.next();
    await this.database.withManager((manager) =>
      manager
        .getRepository(this.entity)
        .insert({ ...safe, id, organizationId } as unknown as QueryDeepPartialEntity<T>),
    );
    return id;
  }
  public override async updateInOrg(
    organizationId: string,
    id: string,
    patch: TenantUpdate<T>,
  ): Promise<void> {
    requireScope(organizationId);
    const safe = Object.fromEntries(
      Object.entries(patch).filter(([key]) => !PROTECTED_COLUMNS.has(key)),
    );
    const result = await this.database.withManager((manager) =>
      manager
        .getRepository(this.entity)
        .update(
          { id, organizationId, deletedAt: IsNull() } as unknown as FindOptionsWhere<T>,
          safe as unknown as QueryDeepPartialEntity<T>,
        ),
    );
    if (!result.affected) throw new AppException(ErrorCode.NOT_FOUND);
  }
}
const PROTECTED_COLUMNS = new Set(['id', 'organizationId', 'createdAt', 'updatedAt', 'deletedAt']);

function requireScope(organizationId: string): void {
  if (!organizationId) throw new AppException(ErrorCode.FORBIDDEN);
}
