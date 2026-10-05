import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../core/database/base.entity';
import { ORGANIZATION_PLAN, DEFAULT_TIMEZONE } from '../../shared/identity.constants';
import type { Locale } from '../../shared/locale.constants';
@Entity('organizations')
export class OrganizationEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 200 }) name!: string;
  @Index({ unique: true }) @Column({ type: 'varchar', length: 250 }) slug!: string;
  @Column({ type: 'varchar', default: DEFAULT_TIMEZONE }) timezone!: string;
  @Column({ type: 'varchar', length: 2, default: 'en' }) defaultLocale!: Locale;
  @Column({ type: 'jsonb', default: {} }) settings!: Record<string, unknown>;
  @Column({
    type: 'enum',
    enum: Object.values(ORGANIZATION_PLAN),
    enumName: 'organization_plan',
    default: ORGANIZATION_PLAN.FREE,
  })
  plan!: string;
  @Column({ type: 'boolean', default: false }) isActive!: boolean;
}
