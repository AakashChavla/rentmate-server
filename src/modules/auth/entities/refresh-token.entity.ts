import { Column, Entity, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../core/database/base/tenant-base.entity';

@Entity('refresh_tokens')
@Index('refresh_tokens_organization_id_user_id_idx', ['organizationId', 'userId'])
export class RefreshToken extends TenantBaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Index('refresh_tokens_family_id_idx')
  @Column({ type: 'uuid', name: 'family_id' })
  familyId!: string;

  @Column({ type: 'varchar', name: 'token_hash', length: 64 })
  tokenHash!: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', name: 'revoked_at', nullable: true })
  revokedAt!: Date | null;

  @Column({ type: 'uuid', name: 'replaced_by_id', nullable: true })
  replacedById!: string | null;

  @Column({ type: 'varchar', name: 'user_agent', length: 512, nullable: true })
  userAgent!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip!: string | null;
}
