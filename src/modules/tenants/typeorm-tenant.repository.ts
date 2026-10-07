import { Inject, Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { TenantRepository } from './tenants.contract';
import { TenantEntity } from './tenant.entity';

import { TENANT_STATUS as S } from '../../shared/lease.constants';
import type {
  TenantInput,
  TenantRecord,
  TenantStatus,
  DomainFilter,
} from '../../shared/lease.types';
import { domainPage } from '../../core/pagination/domain-page.repository';
@Injectable()
export class TypeOrmTenantRepository extends TenantRepository {
  public constructor(@Inject(DatabaseConnection) private readonly db: DatabaseConnection) {
    super();
  }
  public override create(
    organizationId: string,
    input: TenantInput & {
      idCipher: string | null;
      idHash: string | null;
      idLastFour: string | null;
    },
  ): Promise<TenantRecord> {
    return this.db.withManager((m) =>
      m.getRepository(TenantEntity).save({
        organizationId,
        propertyId: input.propertyId,
        fullName: input.fullName,
        phone: input.phone,
        email: input.email.toLowerCase(),
        emergencyContact: input.emergencyContact ?? null,
        idCipher: input.idCipher,
        idHash: input.idHash,
        idLastFour: input.idLastFour,
        status: S.PENDING,
        userId: null,
        reviewReason: null,
      }),
    );
  }
  public override get(organizationId: string, id: string): Promise<TenantRecord | null> {
    return this.db.withManager((m) =>
      m.getRepository(TenantEntity).findOneBy({ organizationId, id }),
    );
  }
  public override lock(organizationId: string, id: string): Promise<TenantRecord | null> {
    return this.db.withManager((m) =>
      m
        .getRepository(TenantEntity)
        .findOne({ where: { organizationId, id }, lock: { mode: 'pessimistic_write' } }),
    );
  }
  public override list(
    org: string,
    filter: DomainFilter,
    allowed: string[] | undefined,
    userId: string | undefined,
  ): Promise<{ items: TenantRecord[]; nextCursor: string | null }> {
    return this.db.withManager((m) => {
      const q = m
        .getRepository(TenantEntity)
        .createQueryBuilder('r')
        .innerJoin(
          'properties',
          'p',
          'p.organization_id=r.organization_id AND p.id=r.property_id AND p.deleted_at IS NULL',
        )
        .where('r.organization_id=:org', { org });
      if (userId) q.andWhere('r.user_id=:user', { user: userId });
      if (filter.search)
        q.andWhere('(r.full_name ILIKE :search OR r.email ILIKE :search)', {
          search: '%' + filter.search.replace(/[\\%_]/g, '\\$&') + '%',
        });
      return domainPage(q, filter, allowed);
    });
  }
  public override async review(
    organizationId: string,
    id: string,
    status: TenantStatus,
    reviewReason: string | null,
  ): Promise<void> {
    await this.db.withManager(async (m) => {
      const r = await m
        .getRepository(TenantEntity)
        .update({ organizationId, id, deletedAt: IsNull() }, { status, reviewReason });
      if (!r.affected) throw new AppException(ErrorCode.NOT_FOUND);
    });
  }
  public override async update(
    organizationId: string,
    id: string,
    input: Partial<Pick<TenantRecord, 'fullName' | 'phone' | 'emergencyContact'>>,
  ): Promise<void> {
    await this.db.withManager(async (m) => {
      const r = await m
        .getRepository(TenantEntity)
        .update({ organizationId, id, deletedAt: IsNull() }, input);
      if (!r.affected) throw new AppException(ErrorCode.NOT_FOUND);
    });
  }
  public override async linkInvitation(
    organizationId: string,
    email: string,
    property: string | null,
    userId: string,
  ): Promise<void> {
    await this.db.withManager(async (m) => {
      const q = m
        .getRepository(TenantEntity)
        .createQueryBuilder()
        .update()
        .set({ userId })
        .where(
          'organization_id=:organizationId AND email=:email AND user_id IS NULL AND deleted_at IS NULL',
          { organizationId, email },
        );
      if (property) q.andWhere('property_id=:property', { property });
      await q.execute();
    });
  }
}
