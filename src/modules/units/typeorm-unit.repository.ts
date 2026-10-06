import { Inject, Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import type { SelectQueryBuilder, EntityManager } from 'typeorm';
import { UnitRepository } from './units.contract';
import { UnitEntity } from './unit.entity';
import { UnitConfigEntity } from './unit-config.entity';
import type {
  UnitInput,
  UnitRecord,
  UnitPatch,
  UnitFilter,
  UnitPage,
  UnitConfiguration,
} from '../../shared/unit.types';
import {
  UNIT_LIMITS as L,
  UNIT_STATUS as S,
  BULK_SYNC_LIMIT,
  FURNISHING,
} from '../../shared/unit.constants';
import { encodeKeysetCursor, decodeKeysetCursor } from '../../core/pagination/keyset-cursor';
@Injectable()
export class TypeOrmUnitRepository extends UnitRepository {
  public constructor(@Inject(DatabaseConnection) private readonly db: DatabaseConnection) {
    super();
  }
  public override async lockProperty(org: string, property: string): Promise<void> {
    await this.db.withManager(async (m) => {
      const rows = await m.query<{ id: string }[]>(
        'SELECT id FROM properties WHERE organization_id=$1 AND id=$2 AND deleted_at IS NULL FOR UPDATE',
        [org, property],
      );
      if (!rows.length) throw new AppException(ErrorCode.NOT_FOUND);
    });
  }
  public override create(
    organizationId: string,
    propertyId: string,
    input: UnitInput,
  ): Promise<UnitRecord> {
    return this.db.withManager((m) => {
      const fields = { ...input };
      delete fields.configuration;
      return m.getRepository(UnitEntity).save({ organizationId, propertyId, ...fields });
    });
  }
  public override get(organizationId: string, id: string): Promise<UnitRecord | null> {
    return this.db.withManager((m) =>
      m.getRepository(UnitEntity).findOneBy({ organizationId, id }),
    );
  }
  public override lock(organizationId: string, id: string): Promise<UnitRecord | null> {
    return this.db.withManager((m) =>
      m
        .getRepository(UnitEntity)
        .findOne({ where: { organizationId, id }, lock: { mode: 'pessimistic_write' } }),
    );
  }
  public override list(
    org: string,
    filter: UnitFilter,
    allowed: string[] | undefined,
  ): Promise<UnitPage> {
    return this.db.withManager(async (m) => {
      if (allowed && !allowed.length) return { items: [], nextCursor: null };
      const query = this._query(m, org);
      this._filters(query, filter, allowed);
      const result = await query.getRawAndEntities<{
        u_id: string;
        cursor_time: string;
        floor_name: string | null;
        floor_level: number | null;
        floor_wing: string | null;
      }>();
      const items = result.entities.slice(0, L.PAGE).map((unit) => {
        const row = result.raw.find((raw) => raw.u_id === unit.id);
        return {
          id: unit.id,
          organizationId: unit.organizationId,
          propertyId: unit.propertyId,
          floorId: unit.floorId,
          code: unit.code,
          type: unit.type,
          status: unit.status,
          baseRent: unit.baseRent,
          capacity: unit.capacity,
          createdAt: unit.createdAt,
          floorName: row?.floor_name ?? null,
          floorLevel: row?.floor_level ?? null,
          wing: row?.floor_wing ?? null,
        };
      });
      const last = items.at(-1);
      const row = result.raw.find((raw) => raw.u_id === last?.id);
      return {
        items,
        nextCursor:
          result.entities.length > L.PAGE && last && row
            ? encodeKeysetCursor(row.cursor_time, last.id)
            : null,
      };
    });
  }
  private _query(m: EntityManager, org: string): SelectQueryBuilder<UnitEntity> {
    return m
      .getRepository(UnitEntity)
      .createQueryBuilder('u')
      .innerJoin(
        'properties',
        'p',
        'p.organization_id=u.organization_id AND p.id=u.property_id AND p.deleted_at IS NULL',
      )
      .leftJoin(
        'floors',
        'f',
        'f.organization_id=u.organization_id AND f.id=u.floor_id AND f.deleted_at IS NULL',
      )
      .where('u.organization_id=:org', { org })
      .addSelect('f.name', 'floor_name')
      .addSelect('f.level', 'floor_level')
      .addSelect('f.wing', 'floor_wing')
      .addSelect(
        `to_char(u.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
        'cursor_time',
      )
      .orderBy('u.created_at', 'DESC')
      .addOrderBy('u.id', 'DESC')
      .take(L.PAGE + 1);
  }
  private _filters(
    query: SelectQueryBuilder<UnitEntity>,
    filter: UnitFilter,
    allowed: string[] | undefined,
  ): void {
    if (allowed) query.andWhere('u.property_id IN (:...allowed)', { allowed });
    if (filter.propertyId)
      query.andWhere('u.property_id=:property', { property: filter.propertyId });
    if (filter.floorId) query.andWhere('u.floor_id=:floor', { floor: filter.floorId });
    if (filter.status) query.andWhere('u.status=:status', { status: filter.status });
    if (filter.type) query.andWhere('u.type=:type', { type: filter.type });
    if (filter.search)
      query.andWhere('u.code ILIKE :search', {
        search: '%' + filter.search.replace(/[\\%_]/g, '\\$&') + '%',
      });
    if (filter.cursor) {
      const cursor = decodeKeysetCursor(filter.cursor);
      query.andWhere('(u.created_at,u.id)<(:time,:id)', { time: cursor.time, id: cursor.id });
    }
  }
  public override async update(
    organizationId: string,
    id: string,
    input: UnitPatch,
  ): Promise<void> {
    await this.db.withManager(async (m) => {
      const result = await m
        .getRepository(UnitEntity)
        .update({ organizationId, id, deletedAt: IsNull() }, input);
      if (!result.affected) throw new AppException(ErrorCode.NOT_FOUND);
    });
  }
  public override async remove(organizationId: string, id: string): Promise<void> {
    await this.db.withManager(async (m) => {
      const result = await m.getRepository(UnitEntity).softDelete({ organizationId, id });
      if (!result.affected) throw new AppException(ErrorCode.NOT_FOUND);
    });
  }
  public override async setStatus(
    organizationId: string,
    id: string,
    status: UnitRecord['status'],
  ): Promise<void> {
    await this.db.withManager(async (m) => {
      const result = await m
        .getRepository(UnitEntity)
        .update({ organizationId, id, deletedAt: IsNull() }, { status });
      if (!result.affected) throw new AppException(ErrorCode.NOT_FOUND);
    });
  }
  public override config(
    organizationId: string,
    unitId: string,
  ): Promise<UnitConfiguration | null> {
    return this.db.withManager(
      async (m) =>
        (await m.getRepository(UnitConfigEntity).findOneBy({ organizationId, unitId }))
          ?.configuration ?? null,
    );
  }
  public override async setConfig(
    organizationId: string,
    propertyId: string,
    unitId: string,
    configuration: UnitConfiguration,
  ): Promise<void> {
    await this.db.withManager(async (m) => {
      await m
        .getRepository(UnitConfigEntity)
        .upsert({ organizationId, propertyId, unitId, configuration }, [
          'organizationId',
          'unitId',
        ]);
    });
  }
  public override async bulk(
    organizationId: string,
    propertyId: string,
    rows: UnitInput[],
  ): Promise<number> {
    return this.db.withManager(async (m) => {
      for (let start = 0; start < rows.length; start += BULK_SYNC_LIMIT) {
        const fields = rows.slice(start, start + BULK_SYNC_LIMIT).map((input) => {
          const value = { ...input };
          delete value.configuration;
          return { organizationId, propertyId, ...value };
        });
        const result = await m
          .getRepository(UnitEntity)
          .createQueryBuilder()
          .insert()
          .values(fields)
          .returning('id')
          .execute();
        const ids = result.raw as { id: string }[];
        await m.getRepository(UnitConfigEntity).insert(
          ids.map((row) => ({
            organizationId,
            propertyId,
            unitId: row.id,
            configuration: { amenities: [], size: null, furnishing: FURNISHING.NONE },
          })),
        );
      }
      return rows.length;
    });
  }
  public override counts(
    org: string,
    property: string,
  ): Promise<{ occupied: number; total: number }> {
    return this.db.withManager(async (m) => {
      const rows = await m.query<{ total: number; occupied: number }[]>(
        'SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE status=$3)::int AS occupied FROM units WHERE organization_id=$1 AND property_id=$2 AND deleted_at IS NULL',
        [org, property, S.OCCUPIED],
      );
      return rows[0] ?? { occupied: 0, total: 0 };
    });
  }
  public override bedCount(org: string, id: string, activeOnly = false): Promise<number> {
    return this.db.withManager(async (m) => {
      const rows = await m.query<{ count: number }[]>(
        'SELECT COUNT(*)::int AS count FROM beds WHERE organization_id=$1 AND unit_id=$2 AND deleted_at IS NULL AND ($3=false OR status IN ($4,$5))',
        [org, id, activeOnly, S.OCCUPIED, S.RESERVED],
      );
      return rows[0]?.count ?? 0;
    });
  }
}
