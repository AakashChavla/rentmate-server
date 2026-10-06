import { Column, Entity, Index, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '../../core/database/tenant-base.entity';
import type { UnitConfiguration } from '../../shared/unit.types';
@Entity('unit_configs')
@Unique(['organizationId', 'unitId'])
@Index(['organizationId', 'propertyId'])
export class UnitConfigEntity extends TenantBaseEntity {
  @Column({ type: 'uuid' }) propertyId!: string;
  @Column({ type: 'uuid' }) unitId!: string;
  @Column({ type: 'jsonb' }) configuration!: UnitConfiguration;
  @ManyToOne('UnitEntity', { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'property_id', referencedColumnName: 'propertyId' },
    { name: 'unit_id', referencedColumnName: 'id' },
  ])
  unit?: unknown;
}
