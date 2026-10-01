import { Column, Entity, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../common/base/tenant-base.entity';
import { ScopeType } from '../scope-type';

@Entity('user_role_assignments')
@Index('user_role_assignments_organization_id_user_id_idx', ['organizationId', 'userId'])
export class UserRoleAssignment extends TenantBaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'uuid', name: 'role_id' })
  roleId!: string;

  @Column({ type: 'enum', enum: ScopeType, enumName: 'assignment_scope_type', name: 'scope_type' })
  scopeType!: ScopeType;

  @Column({ type: 'uuid', name: 'scope_id' })
  scopeId!: string;

  @Column({ type: 'uuid', name: 'assigned_by', nullable: true })
  assignedBy!: string | null;

  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expiresAt!: Date | null;
}
