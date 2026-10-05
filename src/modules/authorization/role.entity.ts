import { Entity, PrimaryColumn } from 'typeorm';
import { ROLE } from '../../shared/identity.constants';
@Entity('roles')
export class RoleEntity {
  @PrimaryColumn({ type: 'enum', enum: Object.values(ROLE), enumName: 'role_name' }) name!: string;
}
