import { Inject, Injectable } from '@nestjs/common';
import type { SelectQueryBuilder } from 'typeorm';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import { InvitationRepository, type InviteFilter } from './invitations.contract';
import { InvitationEntity } from './invitation.entity';
import type { InviteRecord } from '../../shared/property.types';
import { INVITE_STATUS as S, PROPERTY_LIMITS as L } from '../../shared/property.constants';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { decodeKeysetCursor, encodeKeysetCursor } from '../../core/pagination/keyset-cursor';
@Injectable()
export class TypeOrmInvitationRepository extends InvitationRepository {
  public constructor(@Inject(DatabaseConnection) private readonly db: DatabaseConnection) {
    super();
  }
  public override create(
    organizationId: string,
    input: Omit<InviteRecord, 'id' | 'createdAt' | 'organizationId'>,
  ): Promise<InviteRecord> {
    return this.db.withManager((m) =>
      m.getRepository(InvitationEntity).save({ organizationId, ...input }),
    );
  }
  public override get(organizationId: string, id: string): Promise<InviteRecord | null> {
    return this.db.withManager((m) =>
      m.getRepository(InvitationEntity).findOneBy({ organizationId, id }),
    );
  }
  public override lock(org: string, id: string): Promise<InviteRecord | null> {
    return this.db.withManager((m) =>
      m
        .getRepository(InvitationEntity)
        .createQueryBuilder('i')
        .where('i.organization_id=:org AND i.id=:id', { org, id })
        .addSelect('i.tokenHash')
        .setLock('pessimistic_write')
        .getOne(),
    );
  }
  public override findByDigest(digest: string): Promise<InviteRecord | null> {
    return this.db.withManager((m) =>
      m
        .getRepository(InvitationEntity)
        .createQueryBuilder('i')
        .where('i.token_hash=:digest', { digest })
        .addSelect('i.tokenHash')
        .getOne(),
    );
  }
  public override async pending(org: string, email: string, now: Date): Promise<boolean> {
    return this.db.withManager(async (m) => {
      await m
        .getRepository(InvitationEntity)
        .createQueryBuilder()
        .update()
        .set({ status: S.EXPIRED })
        .where('organization_id=:org AND email=:email AND status=:pending AND expires_at<=:now', {
          org,
          email,
          pending: S.PENDING,
          now,
        })
        .execute();
      return m
        .getRepository(InvitationEntity)
        .existsBy({ organizationId: org, email, status: S.PENDING });
    });
  }
  public override list(
    org: string,
    filter: InviteFilter,
    allowed: string[] | undefined,
  ): ReturnType<InvitationRepository['list']> {
    return this.db.withManager(async (m) => {
      if (allowed && !allowed.length) return { items: [], nextCursor: null };
      const query = m
        .getRepository(InvitationEntity)
        .createQueryBuilder('i')
        .where('i.organization_id=:org', { org })
        .orderBy('i.created_at', 'DESC')
        .addOrderBy('i.id', 'DESC')
        .addSelect(
          'to_char(i.created_at AT TIME ZONE \'UTC\', \'YYYY-MM-DD"T"HH24:MI:SS.US"Z"\')',
          'cursor_time',
        )
        .take(L.PAGE + 1);
      if (allowed) query.andWhere('i.scope_id IN (:...allowed)', { allowed });
      if (filter.scopeId) query.andWhere('i.scope_id=:scopeId', { scopeId: filter.scopeId });
      this._status(query, filter.status);
      if (filter.cursor)
        query.andWhere('(i.created_at,i.id)<(:time,:id)', decodeKeysetCursor(filter.cursor));
      const result = await query.getRawAndEntities<{ i_id: string; cursor_time: string }>();
      const items = result.entities.slice(0, L.PAGE);
      const last = items.at(-1);
      const raw = result.raw.find((r) => r.i_id === last?.id);
      return {
        items,
        nextCursor:
          result.entities.length > L.PAGE && last && raw
            ? encodeKeysetCursor(raw.cursor_time, last.id)
            : null,
      };
    });
  }
  public override async rotate(
    organizationId: string,
    id: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.db.withManager(async (m) => {
      const result = await m
        .getRepository(InvitationEntity)
        .update({ organizationId, id }, { tokenHash, expiresAt, status: S.PENDING });
      if (!result.affected) throw new AppException(ErrorCode.NOT_FOUND);
    });
  }
  private _status(query: SelectQueryBuilder<InvitationEntity>, status: string | undefined): void {
    if (!status) return;
    if (status === S.EXPIRED)
      query.andWhere(
        '(i.status=:status OR (i.status=:pending AND i.expires_at<=CURRENT_TIMESTAMP))',
        { status, pending: S.PENDING },
      );
    else {
      query.andWhere('i.status=:status', { status });
      if (status === S.PENDING) query.andWhere('i.expires_at>CURRENT_TIMESTAMP');
    }
  }
  public override async transition(
    organizationId: string,
    id: string,
    from: string,
    to: string,
  ): Promise<boolean> {
    return this.db.withManager(
      async (m) =>
        !!(
          await m
            .getRepository(InvitationEntity)
            .update(
              { organizationId, id, status: from as typeof S.PENDING },
              { status: to as typeof S.PENDING },
            )
        ).affected,
    );
  }
}
