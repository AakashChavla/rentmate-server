import { Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Row owned by one organization. The organizations table and foreign key
 * arrive in a later phase; this column is the tenancy boundary until then.
 */
export abstract class TenantBaseEntity extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;
}
