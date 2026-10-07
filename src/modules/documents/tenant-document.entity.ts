import { Column, Entity, Index, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '../../core/database/tenant-base.entity';
import { DOCUMENT_STATUS as D, DOCUMENT_TYPE as Y } from '../../shared/lease.constants';

import type { DocumentStatus, DocumentType } from '../../shared/lease.types';
@Entity('tenant_documents')
@Unique(['organizationId', 'id'])
@Index(['organizationId', 'tenantId', 'status'])
export class TenantDocumentEntity extends TenantBaseEntity {
  @Column({ type: 'uuid' }) propertyId!: string;
  @Column({ type: 'uuid' }) tenantId!: string;
  @Column({ type: 'enum', enum: Object.values(Y), enumName: 'tenant_document_type' })
  type!: DocumentType;
  @Column({ type: 'text' }) storageKey!: string;
  @Column({ type: 'varchar' }) mime!: string;
  @Column({ type: 'integer' }) size!: number;
  @Column({ type: 'varchar' }) checksum!: string;
  @Column({
    type: 'enum',
    enum: Object.values(D),
    enumName: 'tenant_document_status',
    default: D.PENDING,
  })
  status!: DocumentStatus;
  @Column({ type: 'uuid', nullable: true }) reviewedBy!: string | null;
  @Column({ type: 'text', nullable: true }) reviewReason!: string | null;
  @ManyToOne('TenantEntity', { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'property_id', referencedColumnName: 'propertyId' },
    { name: 'tenant_id', referencedColumnName: 'id' },
  ])
  tenant?: unknown;
  @ManyToOne('UserEntity', { onDelete: 'NO ACTION' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'reviewed_by', referencedColumnName: 'id' },
  ])
  reviewer?: unknown;
}
