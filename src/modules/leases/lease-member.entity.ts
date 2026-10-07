import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '../../core/database/tenant-base.entity';
@Entity('lease_members')
@Index(['organizationId', 'leaseId'])
export class LeaseMemberEntity extends TenantBaseEntity {
  @Column({ type: 'uuid' }) leaseId!: string;
  @Column({ type: 'varchar' }) fullName!: string;
  @ManyToOne('LeaseEntity', { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'lease_id', referencedColumnName: 'id' },
  ])
  lease?: unknown;
}
