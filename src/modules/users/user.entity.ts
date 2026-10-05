import { Column, Entity, Index, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '../../core/database/tenant-base.entity';
import { USER_STATUS } from '../../shared/identity.constants';
import type { Locale } from '../../shared/locale.constants';
@Entity('users')
@Unique(['organizationId', 'id'])
@Index('users_email_lower_unique', { synchronize: false })
@Index(['organizationId', 'status', 'createdAt', 'id'])
export class UserEntity extends TenantBaseEntity {
  @Column({ type: 'varchar', length: 320 }) email!: string;
  @Column({ type: 'text', nullable: true, select: false }) passwordHash!: string | null;
  @Column({ type: 'varchar', length: 200 }) fullName!: string;
  @Column({ type: 'varchar', length: 30, nullable: true }) phone!: string | null;
  @Column({ type: 'varchar', length: 2, default: 'en' }) locale!: Locale;
  @Column({
    type: 'enum',
    enum: Object.values(USER_STATUS),
    enumName: 'user_status',
    default: USER_STATUS.PENDING,
  })
  status!: (typeof USER_STATUS)[keyof typeof USER_STATUS];
  @Column({ type: 'timestamptz', nullable: true }) emailVerifiedAt!: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) lastLoginAt!: Date | null;
  @Column({ type: 'boolean', default: false }) isPlatformAdmin!: boolean;
  @ManyToOne('OrganizationEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: unknown;
}
