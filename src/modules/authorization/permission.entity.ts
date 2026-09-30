import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/base/base.entity';

@Entity('permissions')
export class Permission extends BaseEntity {
  @Index('permissions_key_unique', { unique: true })
  @Column({ type: 'varchar', length: 128 })
  key!: string;

  @Column({ type: 'varchar', length: 64 })
  resource!: string;

  @Column({ type: 'varchar', length: 64 })
  action!: string;

  @Column({ type: 'varchar', length: 400 })
  description!: string;
}
