import { Column, Entity, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../core/database/base/tenant-base.entity';

import { OtpPurpose } from '../types/otp-purpose';

@Entity('otp_verifications')
@Index('otp_verifications_organization_id_user_id_purpose_idx', [
  'organizationId',
  'userId',
  'purpose',
])
export class OtpVerification extends TenantBaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'enum', enum: OtpPurpose, enumName: 'otp_purpose' })
  purpose!: OtpPurpose;

  @Column({ type: 'varchar', name: 'code_hash', length: 64 })
  codeHash!: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'timestamptz', name: 'consumed_at', nullable: true })
  consumedAt!: Date | null;
}
