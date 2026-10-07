import { Inject, Injectable } from '@nestjs/common';
import { DocumentsService, DocumentRepository } from './documents.contract';
import { TenantPolicy, TenantRepository } from '../tenants';
import { UnitRepository } from '../units';
import { FileStorage } from '../../integrations/file-storage/file-storage.contract';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import {
  TENANT_PERMISSION as P,
  TENANT_STATUS as T,
  DOCUMENT_STATUS as D,
} from '../../shared/lease.constants';
import type { PermissionContext } from '../../shared/identity.types';
import type {
  DocumentRecord,
  DocumentView,
  DocumentType,
  DocumentStatus,
} from '../../shared/lease.types';
import type { Readable } from 'node:stream';
import { documentView } from './document-view';
@Injectable()
export class DefaultDocumentsService extends DocumentsService {
  public constructor(
    @Inject(DocumentRepository) private readonly repo: DocumentRepository,
    @Inject(TenantPolicy) private readonly policy: TenantPolicy,
    @Inject(TenantRepository) private readonly tenants: TenantRepository,
    @Inject(FileStorage) private readonly storage: FileStorage,
    @Inject(TransactionRunner) private readonly tx: TransactionRunner,
    @Inject(UnitRepository) private readonly units: UnitRepository,
  ) {
    super();
  }
  public override async upload(
    actor: PermissionContext,
    tenant: string,
    type: DocumentType,
    source: AsyncIterable<Uint8Array>,
    mime: string,
  ): Promise<DocumentView> {
    await this.policy.get(actor, tenant, P.UPDATE);
    const file = await this.storage.put(source, mime);
    try {
      return await this.tx.run(async () => {
        const row = await this.policy.get(actor, tenant, P.UPDATE);
        await this.units.lockProperty(actor.organization.id, row.propertyId);
        await this.policy.get(actor, tenant, P.UPDATE);
        await this.tenants.lock(actor.organization.id, tenant);
        await this.tenants.review(actor.organization.id, tenant, T.PENDING, null);
        return documentView(
          await this.repo.create(actor.organization.id, {
            propertyId: row.propertyId,
            tenantId: tenant,
            type,
            storageKey: file.key,
            mime: file.mime,
            size: file.size,
            checksum: file.checksum,
          }),
        );
      });
    } catch (error) {
      await this.storage.remove(file.key);
      throw error;
    }
  }
  public override async list(actor: PermissionContext, tenant: string): Promise<DocumentView[]> {
    await this.policy.get(actor, tenant, P.READ);
    return (await this.repo.list(actor.organization.id, tenant)).map(documentView);
  }
  public override review(
    actor: PermissionContext,
    id: string,
    status: DocumentStatus,
    reason?: string,
  ): Promise<DocumentView> {
    return this.tx.run(async () => {
      if (status === D.REJECTED && !reason?.trim())
        throw new AppException(ErrorCode.VALIDATION_ERROR);
      const row = await this.record(actor, id, P.UPDATE);
      await this.units.lockProperty(actor.organization.id, row.propertyId);
      await this.policy.property(actor, row.propertyId, P.UPDATE);
      await this.tenants.lock(actor.organization.id, row.tenantId);
      await this.tenants.review(actor.organization.id, row.tenantId, T.PENDING, null);
      await this.repo.review(actor.organization.id, id, status, actor.user.id, reason ?? null);
      return documentView(await this.record(actor, id, P.READ));
    });
  }
  public override async download(
    actor: PermissionContext,
    id: string,
  ): Promise<{ url: string; expiresAt: string }> {
    const row = await this.record(actor, id, P.READ),
      signed = await this.storage.sign(row.storageKey);
    return {
      url:
        signed.url ??
        '/api/v1/documents/' +
          encodeURIComponent(id) +
          '/content?expires=' +
          String(signed.expires) +
          '&signature=' +
          encodeURIComponent(signed.signature),
      expiresAt: new Date(signed.expires).toISOString(),
    };
  }
  public override async content(
    actor: PermissionContext,
    id: string,
    expires: number,
    signature: string,
  ): Promise<{ stream: Readable; mime: string }> {
    const row = await this.record(actor, id, P.READ);
    return { stream: await this.storage.open(row.storageKey, expires, signature), mime: row.mime };
  }
  public override remove(actor: PermissionContext, id: string): Promise<void> {
    return this.tx.run(async () => {
      const row = await this.record(actor, id, P.UPDATE);
      await this.units.lockProperty(actor.organization.id, row.propertyId);
      await this.policy.get(actor, row.tenantId, P.UPDATE);
      await this.tenants.lock(actor.organization.id, row.tenantId);
      await this.repo.remove(actor.organization.id, id);
      await this.tenants.review(actor.organization.id, row.tenantId, T.PENDING, null);
      await this.tx.afterCommit(() => this.storage.remove(row.storageKey));
    });
  }
  private async record(
    actor: PermissionContext,
    id: string,
    permission: string,
  ): Promise<DocumentRecord> {
    const row = await this.repo.get(actor.organization.id, id);
    if (!row) throw new AppException(ErrorCode.NOT_FOUND);
    await this.policy.get(actor, row.tenantId, permission);
    return row;
  }
}
