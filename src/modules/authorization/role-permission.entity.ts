import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ROLE } from '../../shared/identity.constants';
@Entity('role_permissions')
export class RolePermissionEntity {
  @PrimaryColumn({ type: 'enum', enum: Object.values(ROLE), enumName: 'role_name' }) role!: string;
  @PrimaryColumn({ type: 'varchar', length: 100 }) permission!: string;
  @ManyToOne('RoleEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role', referencedColumnName: 'name' })
  roleRecord!: unknown;
  @ManyToOne('PermissionEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission', referencedColumnName: 'name' })
  permissionRecord!: unknown;
}
