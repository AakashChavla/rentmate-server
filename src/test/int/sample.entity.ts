import { Entity, Column } from 'typeorm';
import { TenantBaseEntity } from '../../core/database/tenant-base.entity';
@Entity('foundation_isolation_sample')
export class SampleEntity extends TenantBaseEntity {
  @Column({ type: 'text' }) public name!: string;
}
