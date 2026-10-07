import { UserEntity } from '../../../src/modules/users/user.entity';
import { UserRoleAssignmentEntity } from '../../../src/modules/authorization/user-role-assignment.entity';
import { ROLE, SCOPE, USER_STATUS } from '../../../src/shared/identity.constants';
import { ACCOUNTS, DEMO } from './catalog';
import { demoId, required, type DemoContext } from './context';
export async function seedAccounts(context: DemoContext): Promise<void> {
  for (const item of ACCOUNTS) {
    const repo = context.manager.getRepository(UserEntity);
    const email = item.role.toLowerCase() + '@' + DEMO.domain;
    const existing = await repo.findOneBy({ email });
    if (existing && existing.organizationId !== context.orgId)
      throw new Error('Demo email is owned by a different organization');
    const user = await repo.save({
      id: existing?.id ?? demoId('user:' + email),
      organizationId: context.orgId,
      email,
      fullName: item.name,
      phone: null,
      passwordHash: context.passwordHash,
      locale: item.role === ROLE.TENANT ? 'hi' : 'en',
      status: USER_STATUS.ACTIVE,
      emailVerifiedAt: context.today,
      isPlatformAdmin: item.role === ROLE.SUPER_ADMIN,
    });
    const propertyId = item.property ? required(context.properties.get(item.property)).id : null;
    await assignRole(context, user.id, item.role, propertyId);
    context.users.set(item.role, user);
  }
}

async function assignRole(
  context: DemoContext,
  userId: string,
  role: string,
  propertyId: string | null,
): Promise<void> {
  await context.manager.query(
    'DELETE FROM user_role_assignments WHERE organization_id=$1 AND user_id=$2 AND role=$3 AND (scope_id<>$4 OR scope<>$5)',
    [
      context.orgId,
      userId,
      role,
      propertyId ?? context.orgId,
      propertyId ? SCOPE.PROPERTY : SCOPE.ORGANIZATION,
    ],
  );
  await context.manager
    .getRepository(UserRoleAssignmentEntity)
    .createQueryBuilder()
    .insert()
    .values({
      organizationId: context.orgId,
      userId: userId,
      role: role,
      scope: propertyId ? SCOPE.PROPERTY : SCOPE.ORGANIZATION,
      scopeId: propertyId ?? context.orgId,
      propertyId,
    })
    .orIgnore()
    .execute();
}
