import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '../../core/database/tenant-base.entity';
import { CONSENT } from '../../shared/identity.constants';
@Entity('user_consents')
@Index(['organizationId', 'userId'])
export class UserConsentEntity extends TenantBaseEntity {
  @Column({ type: 'uuid' }) userId!: string;
  @Column({ type: 'enum', enum: [CONSENT.TERMS, CONSENT.PRIVACY], enumName: 'consent_document' })
  documentType!: string;
  @Column({ type: 'varchar', length: 100 }) version!: string;
  @Column({ type: 'timestamptz' }) acceptedAt!: Date;
  @Column({ type: 'varchar', length: 100 }) ip!: string;
  @ManyToOne('UserEntity', { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'user_id', referencedColumnName: 'id' },
  ])
  user!: unknown;
}
