import type { TenantRecord, TenantView } from '../../shared/lease.types';
export function tenantView(row: TenantRecord): TenantView {
  return {
    id: row.id,
    organizationId: row.organizationId,
    propertyId: row.propertyId,
    fullName: row.fullName,
    phone: row.phone,
    email: row.email,
    status: row.status,
    userId: row.userId,
    emergencyContact: row.emergencyContact,
    reviewReason: row.reviewReason,
    createdAt: row.createdAt,
    maskedId: row.idLastFour ? '••••' + row.idLastFour : null,
  };
}
