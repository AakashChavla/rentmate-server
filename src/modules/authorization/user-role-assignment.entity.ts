import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { TenantBaseEntity } from '../../core/database/tenant-base.entity';
import { ROLE, SCOPE } from '../../shared/identity.constants';
@Entity('user_role_assignments')
@Index(['organizationId', 'userId'])
@Index(['organizationId', 'role'])
@Unique(['organizationId', 'userId', 'role', 'scope', 'scopeId'])
export class UserRoleAssignmentEntity extends TenantBaseEntity {
  @Column({ type: 'uuid' }) userId!: string;
  @Column({ type: 'enum', enum: Object.values(ROLE), enumName: 'role_name' }) role!: string;
  @Column({
    type: 'enum',
    enum: Object.values(SCOPE),
    enumName: 'role_scope',
    default: SCOPE.ORGANIZATION,
  })
  scope!: (typeof SCOPE)[keyof typeof SCOPE];
  @Column({ type: 'uuid' }) scopeId!: string;
  @Column({ type: 'timestamptz', nullable: true }) expiresAt!: Date | null;
  @ManyToOne('UserEntity', { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'organization_id', referencedColumnName: 'organizationId' },
    { name: 'user_id', referencedColumnName: 'id' },
  ])
  user!: unknown;
  @ManyToOne('RoleEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role', referencedColumnName: 'name' })
  roleRecord!: unknown;
}
