import type { SelectQueryBuilder } from 'typeorm';
import { IsNull } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import { PropertyRepository } from './properties.contract';
import { PropertyEntity } from './property.entity';
import { PropertyConfigEntity } from './property-config.entity';
import type {
  PropertyInput,
  PropertyRecord,
  PropertyPatch,
  PropertyFilter,
  PropertyConfiguration,
} from '../../shared/property.types';
import { PROPERTY_LIMITS as L } from '../../shared/property.constants';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { decodeKeysetCursor, encodeKeysetCursor } from '../../core/pagination/keyset-cursor';
@Injectable()
export class TypeOrmPropertyRepository extends PropertyRepository {
  public constructor(@Inject(DatabaseConnection) private readonly db: DatabaseConnection) {
    super();
  }
  public override async exists(org: string, id: string): Promise<boolean> {
    return !!(await this.get(org, id));
  }
  public override hasAny(organizationId: string): Promise<boolean> {
    return this.db.withManager((m) => m.getRepository(PropertyEntity).existsBy({ organizationId }));
  }
  public override create(organizationId: string, input: PropertyInput): Promise<PropertyRecord> {
    return this.db.withManager(async (m) => {
      const fields = { ...input };
      delete fields.configuration;
      const result = await m.getRepository(PropertyEntity).save({ organizationId, ...fields });
      return m.getRepository(PropertyEntity).findOneByOrFail({ organizationId, id: result.id });
    });
  }
  public override get(organizationId: string, id: string): Promise<PropertyRecord | null> {
    return this.db.withManager((m) =>
      m.getRepository(PropertyEntity).findOneBy({ organizationId, id }),
    );
  }
  public override list(
    org: string,
    filter: PropertyFilter,
    allowed: string[] | undefined,
  ): ReturnType<PropertyRepository['list']> {
    return this.db.withManager(async (m) => {
      if (allowed && !allowed.length) return { items: [], nextCursor: null };
      const query = m
        .getRepository(PropertyEntity)
        .createQueryBuilder('p')
        .where('p.organization_id=:org', { org })
        .orderBy('p.created_at', 'DESC')
        .addOrderBy('p.id', 'DESC')
        .addSelect(
          'to_char(p.created_at AT TIME ZONE \'UTC\', \'YYYY-MM-DD"T"HH24:MI:SS.US"Z"\')',
          'cursor_time',
        )
        .take(L.PAGE + 1);
      this._filters(query, filter, allowed);
      const result = await query.getRawAndEntities<{ p_id: string; cursor_time: string }>();
      const items = result.entities.slice(0, L.PAGE);
      const last = items.at(-1);
      const raw = result.raw.find((r) => r.p_id === last?.id);
      return {
        items,
        nextCursor:
          result.entities.length > L.PAGE && last && raw
            ? encodeKeysetCursor(raw.cursor_time, last.id)
            : null,
      };
    });
  }
  private _filters(
    query: SelectQueryBuilder<PropertyEntity>,
    filter: PropertyFilter,
    allowed: string[] | undefined,
  ): void {
    if (allowed) query.andWhere('p.id IN (:...allowed)', { allowed });
    if (filter.propertyId) query.andWhere('p.id=:propertyId', { propertyId: filter.propertyId });
    if (filter.type) query.andWhere('p.type=:type', { type: filter.type });
    if (filter.status) query.andWhere('p.status=:status', { status: filter.status });
    if (filter.search)
      query.andWhere('(p.name ILIKE :search OR p.city ILIKE :search)', {
        search: '%' + filter.search.replaceAll('%', '\\%').replaceAll('_', '\\_') + '%',
      });
    if (filter.cursor)
      query.andWhere('(p.created_at,p.id)<(:time,:id)', decodeKeysetCursor(filter.cursor));
  }
  public override async update(
    organizationId: string,
    id: string,
    patch: PropertyPatch,
  ): Promise<void> {
    await this.db.withManager(async (m) => {
      const result = await m
        .getRepository(PropertyEntity)
        .update({ organizationId, id, deletedAt: IsNull() }, patch);
      if (!result.affected) throw new AppException(ErrorCode.NOT_FOUND);
    });
  }
  public override async remove(organizationId: string, id: string): Promise<void> {
    await this.db.withManager(async (m) => {
      const result = await m.getRepository(PropertyEntity).softDelete({ organizationId, id });
      if (!result.affected) throw new AppException(ErrorCode.NOT_FOUND);
    });
  }
  public override async getConfig(
    organizationId: string,
    propertyId: string,
  ): Promise<PropertyConfiguration | null> {
    return this.db.withManager(
      async (m) =>
        (await m.getRepository(PropertyConfigEntity).findOneBy({ organizationId, propertyId }))
          ?.configuration ?? null,
    );
  }
  public override async setConfig(
    organizationId: string,
    propertyId: string,
    configuration: PropertyConfiguration,
  ): Promise<void> {
    await this.db.withManager(async (m) => {
      await m
        .getRepository(PropertyConfigEntity)
        .upsert({ organizationId, propertyId, configuration }, ['organizationId', 'propertyId']);
    });
  }
  public override patchConfig(
    organizationId: string,
    propertyId: string,
    patch: Partial<PropertyConfiguration>,
  ): Promise<PropertyConfiguration> {
    return this.db.withManager(async (m) => {
      const result = await m
        .getRepository(PropertyConfigEntity)
        .createQueryBuilder()
        .update()
        .set({ configuration: () => 'configuration || CAST(:patch AS jsonb)' })
        .where('organization_id=:organizationId AND property_id=:propertyId', {
          organizationId,
          propertyId,
        })
        .setParameter('patch', JSON.stringify(patch))
        .returning(['configuration'])
        .execute();
      const rows = result.raw as { configuration: PropertyConfiguration }[];
      const config = rows[0]?.configuration;
      if (!config) throw new AppException(ErrorCode.NOT_FOUND);
      return config;
    });
  }
}
