import { Entity, PrimaryColumn } from 'typeorm';
@Entity('permissions')
export class PermissionEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 }) name!: string;
}
