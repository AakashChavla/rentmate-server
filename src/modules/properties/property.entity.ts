import { Column, Entity, Index, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '../../core/database/tenant-base.entity';
import {
  PROPERTY_TYPE as T,
  PROPERTY_STATUS as S,
  PROPERTY_DEFAULTS as D,
  PROPERTY_LIMITS as L,
} from '../../shared/property.constants';
import type { PropertyType, PropertyStatus } from '../../shared/property.types';
@Entity('properties')
@Unique(['organizationId', 'id'])
@Index(['organizationId', 'createdAt', 'id'])
@Index(['organizationId', 'type', 'status'])
export class PropertyEntity extends TenantBaseEntity {
  @Column({ type: 'varchar', length: L.NAME }) name!: string;
  @Column({ type: 'enum', enum: Object.values(T), enumName: 'property_type' }) type!: PropertyType;
  @Column({ type: 'varchar', length: L.ADDRESS }) addressLine1!: string;
  @Column({ type: 'varchar', length: L.ADDRESS, nullable: true }) addressLine2!: string | null;
  @Column({ type: 'varchar', length: L.CITY }) city!: string;
  @Column({ type: 'varchar', length: L.CITY }) state!: string;
  @Column({ type: 'varchar', length: L.POSTAL }) postalCode!: string;
  @Column({ type: 'varchar', length: L.COUNTRY, default: D.COUNTRY }) country!: string;
  @Column({ type: 'varchar', length: L.TIMEZONE, nullable: true }) timezone!: string | null;
  @Column({ type: 'enum', enum: Object.values(S), enumName: 'property_status', default: S.ACTIVE })
  status!: PropertyStatus;
  @ManyToOne('OrganizationEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: unknown;
}
