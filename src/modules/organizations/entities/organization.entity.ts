import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/base/base.entity';

export enum OrganizationPlan {
  Free = 'FREE',
  Starter = 'STARTER',
  Pro = 'PRO',
  Enterprise = 'ENTERPRISE',
}

@Entity('organizations')
export class Organization extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Index('organizations_slug_unique', { unique: true })
  @Column({ type: 'varchar', length: 120 })
  slug!: string;

  @Column({ type: 'varchar', length: 64, default: 'Asia/Kolkata' })
  timezone!: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  settings!: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: OrganizationPlan,
    enumName: 'organization_plan',
    default: OrganizationPlan.Free,
  })
  plan!: OrganizationPlan;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;
}
