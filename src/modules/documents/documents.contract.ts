import type { PermissionContext } from '../../shared/identity.types';
import type {
  DocumentRecord,
  DocumentView,
  DocumentType,
  DocumentStatus,
} from '../../shared/lease.types';
import type { Readable } from 'node:stream';
export abstract class DocumentRepository {
  public abstract create(
    org: string,
    input: Omit<
      DocumentRecord,
      'id' | 'organizationId' | 'createdAt' | 'status' | 'reviewedBy' | 'reviewReason'
    >,
  ): Promise<DocumentRecord>;
  public abstract get(org: string, id: string): Promise<DocumentRecord | null>;
  public abstract list(org: string, tenant: string): Promise<DocumentRecord[]>;
  public abstract review(
    org: string,
    id: string,
    status: DocumentStatus,
    reviewer: string,
    reason: string | null,
  ): Promise<void>;
  public abstract remove(org: string, id: string): Promise<void>;
}
export abstract class DocumentsService {
  public abstract upload(
    actor: PermissionContext,
    tenant: string,
    type: DocumentType,
    source: AsyncIterable<Uint8Array>,
    mime: string,
  ): Promise<DocumentView>;
  public abstract list(actor: PermissionContext, tenant: string): Promise<DocumentView[]>;
  public abstract review(
    actor: PermissionContext,
    id: string,
    status: DocumentStatus,
    reason?: string,
  ): Promise<DocumentView>;
  public abstract download(
    actor: PermissionContext,
    id: string,
  ): Promise<{ url: string; expiresAt: string }>;
  public abstract content(
    actor: PermissionContext,
    id: string,
    expires: number,
    signature: string,
  ): Promise<{ stream: Readable; mime: string }>;
  public abstract remove(actor: PermissionContext, id: string): Promise<void>;
}
