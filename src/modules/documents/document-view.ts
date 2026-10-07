import type { DocumentRecord, DocumentView } from '../../shared/lease.types';
export function documentView(row: DocumentRecord): DocumentView {
  return {
    id: row.id,
    organizationId: row.organizationId,
    propertyId: row.propertyId,
    tenantId: row.tenantId,
    type: row.type,
    mime: row.mime,
    size: row.size,
    status: row.status,
    reviewedBy: row.reviewedBy,
    reviewReason: row.reviewReason,
    createdAt: row.createdAt,
  };
}
