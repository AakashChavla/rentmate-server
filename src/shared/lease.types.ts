import type {
  TENANT_STATUS,
  DOCUMENT_STATUS,
  DOCUMENT_TYPE,
  LEASE_STATUS,
} from './lease.constants';
export type TenantStatus = (typeof TENANT_STATUS)[keyof typeof TENANT_STATUS];
export type DocumentStatus = (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS];
export type DocumentType = (typeof DOCUMENT_TYPE)[keyof typeof DOCUMENT_TYPE];
export type LeaseStatus = (typeof LEASE_STATUS)[keyof typeof LEASE_STATUS];
export interface TenantInput {
  propertyId: string;
  fullName: string;
  phone: string;
  email: string;
  emergencyContact?: string;
  idNumber?: string;
}
export interface TenantRecord {
  id: string;
  organizationId: string;
  propertyId: string;
  fullName: string;
  phone: string;
  email: string;
  status: TenantStatus;
  userId: string | null;
  emergencyContact: string | null;
  idCipher: string | null;
  idHash: string | null;
  idLastFour: string | null;
  reviewReason: string | null;
  createdAt: Date;
}
export type TenantView = Omit<TenantRecord, 'idCipher' | 'idHash' | 'idLastFour'> & {
  maskedId: string | null;
};
export interface DomainFilter {
  propertyId?: string;
  status?: string;
  search?: string;
  cursor?: string;
  tenantId?: string;
}
export interface DocumentRecord {
  id: string;
  organizationId: string;
  propertyId: string;
  tenantId: string;
  type: DocumentType;
  storageKey: string;
  mime: string;
  size: number;
  checksum: string;
  status: DocumentStatus;
  reviewedBy: string | null;
  reviewReason: string | null;
  createdAt: Date;
}
export type DocumentView = Omit<DocumentRecord, 'storageKey' | 'checksum'>;
export interface LeaseInput {
  tenantId: string;
  unitId: string;
  bedId?: string | null;
  startDate: string;
  endDate: string;
  rent: string;
  deposit: string;
  dueDay: number;
  members?: string[];
}
export interface LeaseRecord {
  id: string;
  organizationId: string;
  propertyId: string;
  tenantId: string;
  unitId: string;
  bedId: string | null;
  startDate: string;
  endDate: string;
  rent: string;
  deposit: string;
  dueDay: number;
  status: LeaseStatus;
  renewedFromId: string | null;
  terminatedAt: Date | null;
  terminateReason: string | null;
  depositRecordedAt: Date | null;
  depositReference: string | null;
  createdAt: Date;
}
export interface LeaseView extends LeaseRecord {
  members: string[];
}
export interface LeaseChange {
  organizationId: string;
  propertyId: string;
  leaseId: string;
  unitId: string;
  bedId: string | null;
  status: LeaseStatus;
}
