import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { OTP_PURPOSE } from '../../../shared/identity.constants';
@Entity('otp_verifications')
@Index(['organizationId', 'userId', 'purpose', 'createdAt'])
export class OtpVerificationEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) organizationId!: string;
  @Column({ type: 'uuid' }) userId!: string;
  @Column({ type: 'enum', enum: Object.values(OTP_PURPOSE), enumName: 'otp_purpose' })
  purpose!: (typeof OTP_PURPOSE)[keyof typeof OTP_PURPOSE];
  @Column({ type: 'varchar', length: 64 }) codeHash!: string;
  @Column({ type: 'timestamptz' }) expiresAt!: Date;
  @Column({ type: 'timestamptz', nullable: true }) consumedAt!: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
  @ManyToOne('UserEntity', { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'user_id', referencedColumnName: 'id' },
  ])
  user!: unknown;
}
