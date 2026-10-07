import { Column, Entity, Index, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '../../core/database/tenant-base.entity';
import { TENANT_STATUS as T, LEASE_LIMIT as B } from '../../shared/lease.constants';

import type { TenantStatus } from '../../shared/lease.types';
@Entity('tenants')
@Unique(['organizationId', 'id'])
@Unique(['organizationId', 'propertyId', 'id'])
@Index(['organizationId', 'propertyId', 'status'])
@Index(['organizationId', 'userId'])
@Index(['organizationId', 'idHash'])
@Index(['organizationId', 'createdAt', 'id'])
export class TenantEntity extends TenantBaseEntity {
  @Column({ type: 'uuid' }) propertyId!: string;
  @Column({ type: 'varchar', length: B.NAME }) fullName!: string;
  @Column({ type: 'varchar', length: B.PHONE }) phone!: string;
  @Column({ type: 'varchar', length: B.NAME }) email!: string;
  @Column({ type: 'enum', enum: Object.values(T), enumName: 'tenant_status', default: T.PENDING })
  status!: TenantStatus;
  @Column({ type: 'uuid', nullable: true }) userId!: string | null;
  @Column({ type: 'text', nullable: true }) emergencyContact!: string | null;
  @Column({ type: 'text', nullable: true }) idCipher!: string | null;
  @Column({ type: 'varchar', nullable: true }) idHash!: string | null;
  @Column({ type: 'varchar', nullable: true }) idLastFour!: string | null;
  @Column({ type: 'text', nullable: true }) reviewReason!: string | null;
  @ManyToOne('PropertyEntity', { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'property_id', referencedColumnName: 'id' },
  ])
  property?: unknown;
  @ManyToOne('UserEntity', { onDelete: 'NO ACTION' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'user_id', referencedColumnName: 'id' },
  ])
  user?: unknown;
}
