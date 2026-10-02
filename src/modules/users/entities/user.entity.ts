import { Column, Entity, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../core/database/base/tenant-base.entity';

export enum UserStatus {
  Invited = 'INVITED',
  Active = 'ACTIVE',
  Suspended = 'SUSPENDED',
}

@Entity('users')
@Index('users_organization_id_created_at_id_idx', ['organizationId', 'createdAt', 'id'])
export class User extends TenantBaseEntity {
  @Index('users_email_unique', { unique: true })
  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'varchar', name: 'password_hash', length: 255, nullable: true })
  passwordHash!: string | null;

  @Column({ type: 'varchar', name: 'full_name', length: 200 })
  fullName!: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone!: string | null;

  @Column({ type: 'enum', enum: UserStatus, enumName: 'user_status', default: UserStatus.Invited })
  status!: UserStatus;

  @Column({ type: 'timestamptz', name: 'email_verified_at', nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({ type: 'timestamptz', name: 'last_login_at', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ type: 'int', name: 'failed_login_count', default: 0 })
  failedLoginCount!: number;

  @Column({ type: 'timestamptz', name: 'locked_until', nullable: true })
  lockedUntil!: Date | null;

  @Column({ type: 'boolean', name: 'is_platform_admin', default: false })
  isPlatformAdmin!: boolean;

  @Column({ type: 'jsonb', name: 'notification_preferences', default: () => "'{}'" })
  notificationPreferences!: Record<string, unknown>;
}
