import type { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import type { DomainFilter } from '../../shared/lease.types';
import { LEASE_LIMIT as L } from '../../shared/lease.constants';
import { encodeKeysetCursor, decodeKeysetCursor } from './keyset-cursor';
export async function domainPage<T extends ObjectLiteral & { id: string }>(
  q: SelectQueryBuilder<T>,
  filter: DomainFilter,
  allowed: string[] | undefined,
): Promise<{ items: T[]; nextCursor: string | null }> {
  if (allowed && !allowed.length) return { items: [], nextCursor: null };
  if (allowed) q.andWhere('r.property_id IN (:...allowed)', { allowed });
  if (filter.propertyId) q.andWhere('r.property_id=:property', { property: filter.propertyId });
  if (filter.status) q.andWhere('r.status=:status', { status: filter.status });
  if (filter.cursor) {
    const c = decodeKeysetCursor(filter.cursor);
    q.andWhere('(r.created_at,r.id)<(:time,:id)', { time: c.time, id: c.id });
  }
  q.addSelect(
    'to_char(r.created_at AT TIME ZONE \'UTC\',\'YYYY-MM-DD"T"HH24:MI:SS.US"Z"\')',
    'cursor_time',
  )
    .orderBy('r.created_at', 'DESC')
    .addOrderBy('r.id', 'DESC')
    .take(L.PAGE + 1);
  const result = await q.getRawAndEntities<{ cursor_time: string }>();
  const more = result.entities.length > L.PAGE,
    items = result.entities.slice(0, L.PAGE),
    last = items.at(-1),
    stamp = result.raw[L.PAGE - 1]?.cursor_time;
  return {
    items,
    nextCursor: more ? pageCursor(last, stamp) : null,
  };
}

function pageCursor(last: { id: string } | undefined, stamp: string | undefined): string | null {
  return last && stamp ? encodeKeysetCursor(stamp, last.id) : null;
}
