import source from '../../src/core/database/data-source';
import { Argon2PasswordHasher } from '../../src/integrations/password/adapters/argon2/argon2-password-hasher';
import { AppConfigService } from '../../src/core/config/default-app-config.service';
import {
  ROLE,
  USER_STATUS,
  DEFAULT_TIMEZONE,
  PASSWORD_POLICY,
} from '../../src/shared/identity.constants';
import { seedStatements } from './permissions';
import { OrganizationEntity } from '../../src/modules/organizations/organization.entity';
import { UserEntity } from '../../src/modules/users/user.entity';
import { UserRoleAssignmentEntity } from '../../src/modules/authorization/user-role-assignment.entity';
const config = new AppConfigService();
const hasher = new Argon2PasswordHasher(config);
async function organization(slug: string, name: string): Promise<OrganizationEntity> {
  const repository = source.getRepository(OrganizationEntity);
  return (
    (await repository.findOneBy({ slug })) ??
    repository.save({ slug, name, isActive: true, defaultLocale: 'en', timezone: DEFAULT_TIMEZONE })
  );
}
async function account(
  org: OrganizationEntity,
  role: string,
  email: string,
  password: string,
): Promise<void> {
  if (!PASSWORD_POLICY.test(password)) throw new Error('Seed password does not meet policy');
  const repository = source.getRepository(UserEntity);
  let user = await repository.findOneBy({ email: email.toLowerCase() });
  if (!user)
    user = await repository.save({
      organizationId: org.id,
      email: email.toLowerCase(),
      passwordHash: await hasher.hash(password),
      fullName: role,
      locale: 'en',
      status: USER_STATUS.ACTIVE,
      emailVerifiedAt: new Date(),
      isPlatformAdmin: role === ROLE.SUPER_ADMIN,
    });
  if (user.organizationId !== org.id)
    throw new Error('Seed email belongs to a different organization');
  await source
    .getRepository(UserRoleAssignmentEntity)
    .createQueryBuilder()
    .insert()
    .values({
      organizationId: org.id,
      userId: user.id,
      role,
      scope: 'ORGANIZATION',
      scopeId: org.id,
    })
    .orIgnore()
    .execute();
}
async function seed(): Promise<void> {
  await source.initialize();
  try {
    await source.transaction(async (manager) => {
      for (const statement of seedStatements())
        await manager.query(statement.query, statement.parameters);
    });
    const adminEmail = process.env.PLATFORM_ADMIN_EMAIL;
    const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD;
    if (adminEmail && adminPassword)
      await account(
        await organization('platform', 'RentMate Platform'),
        ROLE.SUPER_ADMIN,
        adminEmail,
        adminPassword,
      );
    if (config.get('NODE_ENV') === 'development' && process.env.DEMO_SEED_PASSWORD) {
      const org = await organization('demo', 'RentMate Demo');
      for (const role of Object.values(ROLE).filter((r) => r !== ROLE.SUPER_ADMIN))
        await account(
          org,
          role,
          `${role.toLowerCase()}@demo.rentmate.test`,
          process.env.DEMO_SEED_PASSWORD,
        );
    }
    process.stdout.write(
      'Idempotent permissions and configured accounts seeded. Credentials were not printed.\n',
    );
  } finally {
    await source.destroy();
  }
}
void seed().catch(() => {
  process.stderr.write('Seed failed; check fixture configuration.\n');
  process.exitCode = 1;
});
