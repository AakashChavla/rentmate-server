import { Column, Entity, Index, ManyToOne, JoinColumn, Check } from 'typeorm';
import { TenantBaseEntity } from '../../core/database/tenant-base.entity';
import { ROLE, SCOPE } from '../../shared/identity.constants';
import {
  INVITE_STATUS as S,
  INVITE_TOKEN as T,
  PROPERTY_LIMITS as L,
} from '../../shared/property.constants';
import type { Locale } from '../../shared/locale.constants';
@Entity('organization_invites')
@Index(['organizationId', 'createdAt', 'id'])
@Index(['organizationId', 'status'])
@Index(['organizationId', 'scopeType', 'scopeId'])
@Index(['tokenHash'], { unique: true })
@Index(['organizationId', 'email'], {
  unique: true,
  where: "status = 'PENDING' AND deleted_at IS NULL",
})
@Check(
  "(scope_type = 'ORGANIZATION' AND scope_id = organization_id AND property_id IS NULL) OR (scope_type = 'PROPERTY' AND property_id IS NOT NULL AND property_id = scope_id)",
)
export class InvitationEntity extends TenantBaseEntity {
  @Column({ type: 'varchar', length: L.ADDRESS }) email!: string;
  @Column({ type: 'enum', enum: Object.values(ROLE), enumName: 'role_name' }) roleId!: string;
  @Column({ type: 'enum', enum: Object.values(SCOPE), enumName: 'role_scope' })
  scopeType!: (typeof SCOPE)[keyof typeof SCOPE];
  @Column({ type: 'uuid' }) scopeId!: string;
  @Column({ type: 'uuid', nullable: true }) propertyId!: string | null;
  @Column({ type: 'varchar', length: T.LENGTH, select: false }) tokenHash!: string;
  @Column({ type: 'enum', enum: Object.values(S), enumName: 'invite_status', default: S.PENDING })
  status!: (typeof S)[keyof typeof S];
  @Column({ type: 'timestamptz' }) expiresAt!: Date;
  @Column({ type: 'uuid' }) invitedBy!: string;
  @Column({ type: 'varchar', length: 2 }) locale!: Locale;
  @ManyToOne('UserEntity', { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'invited_by', referencedColumnName: 'id' },
  ])
  inviter!: unknown;
  @ManyToOne('RoleEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id', referencedColumnName: 'name' })
  role!: unknown;
  @ManyToOne('PropertyEntity', { onDelete: 'CASCADE', nullable: true })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'property_id', referencedColumnName: 'id' },
  ])
  property!: unknown;
}
