import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base/base.entity';

export enum RoleKey {
  SuperAdmin = 'SUPER_ADMIN',
  OrgOwner = 'ORG_OWNER',
  PropertyManager = 'PROPERTY_MANAGER',
  Accountant = 'ACCOUNTANT',
  Receptionist = 'RECEPTIONIST',
  MaintenanceStaff = 'MAINTENANCE_STAFF',
  SecurityStaff = 'SECURITY_STAFF',
  Tenant = 'TENANT',
}

@Entity('roles')
export class Role extends BaseEntity {
  @Index('roles_key_unique', { unique: true })
  @Column({ type: 'varchar', length: 64 })
  key!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 400 })
  description!: string;

  @Column({ type: 'boolean', name: 'is_system', default: false })
  isSystem!: boolean;

  @Column({ type: 'uuid', name: 'organization_id', nullable: true })
  organizationId!: string | null;
}
