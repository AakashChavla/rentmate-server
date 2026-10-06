import { Column, Entity, Index, Unique, ManyToOne, JoinColumn, Check } from 'typeorm';
import { TenantBaseEntity } from '../../core/database/tenant-base.entity';
import {
  UNIT_STATUS as S,
  UNIT_TYPE as T,
  UNIT_LIMITS as L,
  UNIT_DEFAULTS as D,
} from '../../shared/unit.constants';
import type { UnitStatus, UnitType } from '../../shared/unit.types';

@Entity('units')
@Unique(['organizationId', 'propertyId', 'id'])
@Unique(['propertyId', 'code'])
@Index(['organizationId', 'propertyId', 'status'])
@Index(['organizationId', 'floorId', 'type'])
@Index(['organizationId', 'createdAt', 'id'])
@Check('"base_rent">=0 AND "capacity">=1 AND "capacity"<=200')
export class UnitEntity extends TenantBaseEntity {
  @Column({ type: 'uuid' }) propertyId!: string;
  @Column({ type: 'uuid', nullable: true }) floorId!: string | null;
  @Column({ type: 'varchar', length: L.CODE }) code!: string;
  @Column({ type: 'enum', enum: Object.values(T), enumName: 'unit_type' }) type!: UnitType;
  @Column({ type: 'enum', enum: Object.values(S), enumName: 'unit_status', default: S.VACANT })
  status!: UnitStatus;
  @Column({ type: 'numeric', precision: 12, scale: 2 }) baseRent!: string;
  @Column({ type: 'integer', default: D.CAPACITY }) capacity!: number;
  @ManyToOne('PropertyEntity', { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'property_id', referencedColumnName: 'id' },
  ])
  property?: unknown;
  @ManyToOne('FloorEntity', { onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'property_id', referencedColumnName: 'propertyId' },
    { name: 'floor_id', referencedColumnName: 'id' },
  ])
  floor?: unknown;
}
