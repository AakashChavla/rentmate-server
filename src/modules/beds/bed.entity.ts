import { Column, Entity, Index, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '../../core/database/tenant-base.entity';
import { UNIT_STATUS as S, UNIT_LIMITS as L } from '../../shared/unit.constants';
import type { UnitStatus } from '../../shared/unit.types';

@Entity('beds')
@Unique(['organizationId', 'unitId', 'id'])
@Unique(['organizationId', 'unitId', 'label'])
@Index(['organizationId', 'propertyId', 'status'])
@Index(['organizationId', 'unitId'])
export class BedEntity extends TenantBaseEntity {
  @Column({ type: 'uuid' }) propertyId!: string;
  @Column({ type: 'uuid' }) unitId!: string;
  @Column({ type: 'varchar', length: L.CODE }) label!: string;
  @Column({ type: 'enum', enum: Object.values(S), enumName: 'unit_status', default: S.VACANT })
  status!: UnitStatus;
  @ManyToOne('UnitEntity', { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'property_id', referencedColumnName: 'propertyId' },
    { name: 'unit_id', referencedColumnName: 'id' },
  ])
  unit?: unknown;
}
