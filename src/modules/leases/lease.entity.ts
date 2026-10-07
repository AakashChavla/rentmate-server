import { Check, Exclusion, Column, Entity, Index, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '../../core/database/tenant-base.entity';
import { LEASE_STATUS as L } from '../../shared/lease.constants';
import { LEASE_UNIT_BED_EXCLUSION } from '../../shared/lease-booking.constants';

import type { LeaseStatus } from '../../shared/lease.types';
@Entity('leases')
@Check(
  'lease_dates_money',
  '"start_date" < "end_date" AND "rent">=0 AND "deposit">=0 AND "due_day">=1 AND "due_day"<=28',
)
@Exclusion(
  'lease_target_dates',
  'USING gist ("organization_id" WITH =, (COALESCE("bed_id","unit_id")) WITH =, daterange("start_date","end_date",\'[)\') WITH &&) WHERE ("status" NOT IN (\'EXPIRED\',\'TERMINATED\') AND "deleted_at" IS NULL)',
)
@Unique(['organizationId', 'id'])
@Exclusion('lease_unit_bed_dates', LEASE_UNIT_BED_EXCLUSION)
@Index(['organizationId', 'tenantId', 'startDate'])
@Index(['organizationId', 'propertyId', 'status', 'endDate'])
@Index(['organizationId', 'unitId', 'bedId'])
@Index(['organizationId', 'createdAt', 'id'])
export class LeaseEntity extends TenantBaseEntity {
  @Column({ type: 'uuid' }) propertyId!: string;
  @Column({ type: 'uuid' }) tenantId!: string;
  @Column({ type: 'uuid' }) unitId!: string;
  @Column({ type: 'uuid', nullable: true }) bedId!: string | null;
  @Column({ type: 'date' }) startDate!: string;
  @Column({ type: 'date' }) endDate!: string;
  @Column({ type: 'numeric', precision: 12, scale: 2 }) rent!: string;
  @Column({ type: 'numeric', precision: 12, scale: 2 }) deposit!: string;
  @Column({ type: 'integer' }) dueDay!: number;
  @Column({ type: 'enum', enum: Object.values(L), enumName: 'lease_status', default: L.PENDING })
  status!: LeaseStatus;
  @Column({ type: 'uuid', nullable: true }) renewedFromId!: string | null;
  @Column({ type: 'timestamptz', nullable: true }) terminatedAt!: Date | null;
  @Column({ type: 'text', nullable: true }) terminateReason!: string | null;
  @Column({ type: 'timestamptz', nullable: true }) depositRecordedAt!: Date | null;
  @Column({ type: 'text', nullable: true }) depositReference!: string | null;
  @ManyToOne('TenantEntity', { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'property_id', referencedColumnName: 'propertyId' },
    { name: 'tenant_id', referencedColumnName: 'id' },
  ])
  tenant?: unknown;
  @ManyToOne('UnitEntity', { onDelete: 'NO ACTION' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'property_id', referencedColumnName: 'propertyId' },
    { name: 'unit_id', referencedColumnName: 'id' },
  ])
  unit?: unknown;
  @ManyToOne('BedEntity', { onDelete: 'NO ACTION' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'unit_id', referencedColumnName: 'unitId' },
    { name: 'bed_id', referencedColumnName: 'id' },
  ])
  bed?: unknown;
  @ManyToOne('LeaseEntity', { onDelete: 'NO ACTION' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'renewed_from_id', referencedColumnName: 'id' },
  ])
  renewedFrom?: unknown;
}
