import { Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Row owned by one organization. Feature migrations add the foreign key.
 * This column is the tenancy boundary for every tenant query.
 */
export abstract class TenantBaseEntity extends BaseEntity {
  @Index()
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;
}
