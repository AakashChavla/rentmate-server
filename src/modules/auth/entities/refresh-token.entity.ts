import {
  Entity,
  Column,
  Index,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
@Entity('refresh_tokens')
@Index(['organizationId', 'userId'])
@Index(['organizationId', 'familyId'])
export class RefreshTokenEntity {
  @PrimaryColumn({ type: 'uuid' }) id!: string;
  @Column({ type: 'uuid' }) organizationId!: string;
  @Column({ type: 'uuid' }) userId!: string;
  @Column({ type: 'uuid' }) familyId!: string;
  @Column({ type: 'varchar', length: 64 }) tokenHash!: string;
  @Column({ type: 'uuid', nullable: true }) replacedById!: string | null;
  @Column({ type: 'timestamptz', nullable: true }) revokedAt!: Date | null;
  @Column({ type: 'timestamptz' }) expiresAt!: Date;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
  @Column({ type: 'varchar', length: 100 }) ip!: string;
  @Column({ type: 'varchar', length: 1000 }) userAgent!: string;
  @ManyToOne('UserEntity', { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'user_id', referencedColumnName: 'id' },
  ])
  user!: unknown;
}
