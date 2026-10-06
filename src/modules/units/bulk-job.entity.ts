import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '../../core/database/tenant-base.entity';
import { BULK_STATUS as S } from '../../shared/unit.constants';
import type { BulkPattern, BulkRecord } from '../../shared/unit.types';
@Entity('unit_bulk_jobs')
@Index(['organizationId', 'propertyId', 'createdAt', 'id'])
export class BulkJobEntity extends TenantBaseEntity {
  @Column({ type: 'uuid' }) propertyId!: string;
  @Column({ type: 'uuid' }) requestedBy!: string;
  @Column({ type: 'jsonb' }) pattern!: BulkPattern;
  @Column({
    type: 'enum',
    enum: Object.values(S),
    enumName: 'unit_bulk_status',
    default: S.PENDING,
  })
  status!: BulkRecord['status'];
  @Column({ type: 'integer', default: 0 }) createdCount!: number;
  @Column({ type: 'varchar', nullable: true }) errorCode!: string | null;
  @ManyToOne('PropertyEntity', { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'property_id', referencedColumnName: 'id' },
  ])
  property?: unknown;
  @ManyToOne('UserEntity', { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'requested_by', referencedColumnName: 'id' },
  ])
  requester?: unknown;
}
