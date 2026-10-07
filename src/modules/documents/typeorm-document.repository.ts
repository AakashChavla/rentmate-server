import { Inject, Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { DocumentRepository } from './documents.contract';
import { TenantDocumentEntity } from './tenant-document.entity';

import type { DocumentRecord, DocumentStatus } from '../../shared/lease.types';
import { DOCUMENT_STATUS as S } from '../../shared/lease.constants';
@Injectable()
export class TypeOrmDocumentRepository extends DocumentRepository {
  public constructor(@Inject(DatabaseConnection) private readonly db: DatabaseConnection) {
    super();
  }
  public override create(
    organizationId: string,
    input: Omit<
      DocumentRecord,
      'id' | 'organizationId' | 'createdAt' | 'status' | 'reviewedBy' | 'reviewReason'
    >,
  ): Promise<DocumentRecord> {
    return this.db.withManager((m) =>
      m.getRepository(TenantDocumentEntity).save({
        organizationId,
        ...input,
        status: S.PENDING,
        reviewedBy: null,
        reviewReason: null,
      }),
    );
  }
  public override get(organizationId: string, id: string): Promise<DocumentRecord | null> {
    return this.db.withManager((m) =>
      m.getRepository(TenantDocumentEntity).findOneBy({ organizationId, id }),
    );
  }
  public override list(organizationId: string, tenantId: string): Promise<DocumentRecord[]> {
    return this.db.withManager((m) =>
      m
        .getRepository(TenantDocumentEntity)
        .find({ where: { organizationId, tenantId }, order: { createdAt: 'ASC' } }),
    );
  }
  public override async review(
    organizationId: string,
    id: string,
    status: DocumentStatus,
    reviewedBy: string,
    reviewReason: string | null,
  ): Promise<void> {
    await this.db.withManager(async (m) => {
      const r = await m
        .getRepository(TenantDocumentEntity)
        .update({ organizationId, id, deletedAt: IsNull() }, { status, reviewedBy, reviewReason });
      if (!r.affected) throw new AppException(ErrorCode.NOT_FOUND);
    });
  }
  public override async remove(organizationId: string, id: string): Promise<void> {
    await this.db.withManager(async (m) => {
      const r = await m.getRepository(TenantDocumentEntity).softDelete({ organizationId, id });
      if (!r.affected) throw new AppException(ErrorCode.NOT_FOUND);
    });
  }
}
