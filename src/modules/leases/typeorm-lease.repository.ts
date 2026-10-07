import { Inject, Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { LeaseRepository } from './leases.contract';
import { LeaseEntity } from './lease.entity';

import { LeaseMemberEntity } from './lease-member.entity';
import type { DomainFilter, LeaseInput, LeaseRecord, LeaseStatus } from '../../shared/lease.types';
import { LEASE_STATUS as S, LEASE_TERMINAL, LEASE_LIMIT as L } from '../../shared/lease.constants';
import { domainPage } from '../../core/pagination/domain-page.repository';
@Injectable()
export class TypeOrmLeaseRepository extends LeaseRepository {
  public constructor(@Inject(DatabaseConnection) private readonly db: DatabaseConnection) {
    super();
  }
  public override create(
    organizationId: string,
    propertyId: string,
    input: LeaseInput,
    renewedFromId?: string,
  ): Promise<LeaseRecord> {
    return this.db.withManager(async (m) => {
      const { members, ...fields } = input;
      const row = await m.getRepository(LeaseEntity).save({
        organizationId,
        propertyId,
        ...fields,
        bedId: input.bedId ?? null,
        renewedFromId: renewedFromId ?? null,
        status: S.PENDING,
        terminatedAt: null,
        terminateReason: null,
        depositRecordedAt: null,
        depositReference: null,
      });
      if (members?.length)
        await m
          .getRepository(LeaseMemberEntity)
          .insert(members.map((fullName) => ({ organizationId, leaseId: row.id, fullName })));
      return row;
    });
  }
  public override get(organizationId: string, id: string): Promise<LeaseRecord | null> {
    return this.db.withManager((m) =>
      m.getRepository(LeaseEntity).findOneBy({ organizationId, id }),
    );
  }
  public override lock(organizationId: string, id: string): Promise<LeaseRecord | null> {
    return this.db.withManager((m) =>
      m
        .getRepository(LeaseEntity)
        .findOne({ where: { organizationId, id }, lock: { mode: 'pessimistic_write' } }),
    );
  }
  public override list(
    org: string,
    filter: DomainFilter,
    allowed: string[] | undefined,
    userId: string | undefined,
  ): Promise<{ items: LeaseRecord[]; nextCursor: string | null }> {
    return this.db.withManager((m) => {
      const q = m
        .getRepository(LeaseEntity)
        .createQueryBuilder('r')
        .innerJoin(
          'tenants',
          't',
          't.organization_id=r.organization_id AND t.id=r.tenant_id AND t.deleted_at IS NULL',
        )
        .where('r.organization_id=:org', { org });
      if (userId) q.andWhere('t.user_id=:user', { user: userId });
      if (filter.tenantId) q.andWhere('r.tenant_id=:tenant', { tenant: filter.tenantId });
      if (filter.search)
        q.andWhere('t.full_name ILIKE :search', {
          search: '%' + filter.search.replace(/[\\%_]/g, '\\$&') + '%',
        });
      return domainPage(q, filter, allowed);
    });
  }
  public override overlap(org: string, input: LeaseInput, except?: string): Promise<boolean> {
    return this.db.withManager(async (m) => {
      const q = m
        .getRepository(LeaseEntity)
        .createQueryBuilder('r')
        .where('r.organization_id=:org AND r.unit_id=:unit', { org, unit: input.unitId })
        .andWhere('r.status NOT IN (:...terminal)', { terminal: LEASE_TERMINAL })
        .andWhere('r.start_date<:end AND r.end_date>:start', {
          end: input.endDate,
          start: input.startDate,
        });
      if (input.bedId) q.andWhere('(r.bed_id IS NULL OR r.bed_id=:bed)', { bed: input.bedId });
      if (except) q.andWhere('r.id<>:except', { except });
      return q.getExists();
    });
  }
  public override async transition(
    organizationId: string,
    id: string,
    status: LeaseStatus,
    fields: Partial<
      Pick<
        LeaseRecord,
        'terminatedAt' | 'terminateReason' | 'depositRecordedAt' | 'depositReference'
      >
    >,
  ): Promise<void> {
    await this.db.withManager(async (m) => {
      const r = await m
        .getRepository(LeaseEntity)
        .update({ organizationId, id, deletedAt: IsNull() }, { status, ...fields });
      if (!r.affected) throw new AppException(ErrorCode.NOT_FOUND);
    });
  }
  public override members(organizationId: string, leaseId: string): Promise<string[]> {
    return this.db.withManager(async (m) =>
      (await m.getRepository(LeaseMemberEntity).findBy({ organizationId, leaseId })).map(
        (r) => r.fullName,
      ),
    );
  }
  public override due(
    today: string,
    before: string,
  ): Promise<{ organizationId: string; id: string }[]> {
    return this.db.withManager(async (m) =>
      (
        await m
          .getRepository(LeaseEntity)
          .createQueryBuilder('r')
          .select(['r.id', 'r.organizationId'])
          .where(
            '(r.end_date<=:today AND r.status IN (:...statuses)) OR (r.end_date<=:before AND r.status=:active)',
            {
              today,
              before,
              active: S.ACTIVE,
              statuses: [S.PENDING, S.ACTIVE, S.EXPIRING, S.RENEWED],
            },
          )
          .orderBy('r.end_date', 'ASC')
          .take(L.PAGE)
          .getMany()
      ).map(({ id, organizationId }) => ({ id, organizationId })),
    );
  }
  public protectedTarget(org: string, unit: string, bed?: string): Promise<boolean> {
    return this.db.withManager((m) => {
      const q = m
        .getRepository(LeaseEntity)
        .createQueryBuilder('r')
        .where('r.organization_id=:org AND r.unit_id=:unit', { org, unit })
        .andWhere('r.status NOT IN (:...terminal)', { terminal: LEASE_TERMINAL });
      if (bed) q.andWhere('(r.bed_id IS NULL OR r.bed_id=:bed)', { bed });
      return q.getExists();
    });
  }
  public override occupied(org: string, unit: string, bed: string | null): Promise<boolean> {
    return this.db.withManager((m) => {
      const q = m
        .getRepository(LeaseEntity)
        .createQueryBuilder('r')
        .where('r.organization_id=:org AND r.unit_id=:unit', { org, unit })
        .andWhere('r.status IN (:...statuses)', { statuses: [S.ACTIVE, S.EXPIRING, S.RENEWED] });
      if (bed) q.andWhere('r.bed_id=:bed', { bed });
      return q.getExists();
    });
  }
}
