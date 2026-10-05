import { Column, Entity, Index, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '../../core/database/tenant-base.entity';
import type { PropertyConfiguration } from '../../shared/property.types';
@Entity('property_configs')
@Unique(['organizationId', 'propertyId'])
@Index(['organizationId'])
export class PropertyConfigEntity extends TenantBaseEntity {
  @Column({ type: 'uuid' }) propertyId!: string;
  @Column({ type: 'jsonb' }) configuration!: PropertyConfiguration;
  @ManyToOne('PropertyEntity', { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'property_id', referencedColumnName: 'id' },
  ])
  property!: unknown;
}
