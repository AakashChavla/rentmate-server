import { Column, Entity, Index, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '../../core/database/tenant-base.entity';
import { UNIT_LIMITS as L, UNIT_DEFAULTS as D } from '../../shared/unit.constants';
@Entity('floors')
@Unique(['organizationId', 'propertyId', 'id'])
@Unique(['organizationId', 'propertyId', 'level', 'wing'])
@Index(['organizationId', 'propertyId', 'createdAt', 'id'])
export class FloorEntity extends TenantBaseEntity {
  @Column({ type: 'uuid' }) propertyId!: string;
  @Column({ type: 'varchar', length: L.NAME }) name!: string;
  @Column({ type: 'integer' }) level!: number;
  @Column({ type: 'varchar', length: L.WING, default: D.WING }) wing!: string;
  @ManyToOne('PropertyEntity', { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'property_id', referencedColumnName: 'id' },
  ])
  property?: unknown;
}
