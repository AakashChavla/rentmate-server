import type { LeaseRecord } from '../../shared/lease.types';
export function leaseSummary(row: LeaseRecord): LeaseRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    propertyId: row.propertyId,
    tenantId: row.tenantId,
    unitId: row.unitId,
    bedId: row.bedId,
    startDate: row.startDate,
    endDate: row.endDate,
    rent: row.rent,
    deposit: row.deposit,
    dueDay: row.dueDay,
    status: row.status,
    renewedFromId: row.renewedFromId,
    terminatedAt: row.terminatedAt,
    terminateReason: row.terminateReason,
    depositRecordedAt: row.depositRecordedAt,
    depositReference: row.depositReference,
    createdAt: row.createdAt,
  };
}
