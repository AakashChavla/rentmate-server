import { AppDataSource } from '../../src/core/database/data-source';
import {
  Organization,
  OrganizationPlan,
} from '../../src/modules/organizations/entities/organization.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { UserStatus } from '../../src/modules/users/types/user-status';
import { UserRepository } from '../../src/modules/users/repositories/user.repository';

describe('Targeted Writes Race Condition Integration Test (H1)', () => {
  let userRepo: UserRepository;
  let org: Organization;
  let user: User;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    userRepo = new UserRepository(AppDataSource);
    const orgRepo = AppDataSource.getRepository(Organization);

    org = await orgRepo.save(
      orgRepo.create({
        name: 'Race Test Org',
        slug: `race-org-${Date.now()}`,
        timezone: 'UTC',
        plan: OrganizationPlan.Free,
      }),
    );

    user = await userRepo.createUser({
      organizationId: org.id,
      email: `raceuser-${Date.now()}@example.com`,
      fullName: 'Race User',
      status: UserStatus.Active,
      passwordHash: 'hash',
    });
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.getRepository(User).delete({ organizationId: org.id });
      await AppDataSource.getRepository(Organization).delete({ id: org.id });
      await AppDataSource.destroy();
    }
  });

  it('user stays suspended when login success and suspend execute concurrently via Promise.all', async () => {
    await Promise.all([
      userRepo.recordLoginSuccess(org.id, user.id),
      userRepo.setStatus(org.id, user.id, UserStatus.Suspended),
    ]);

    const refreshed = await userRepo.findByIdInOrg(org.id, user.id);
    expect(refreshed?.status).toBe(UserStatus.Suspended);
    expect(refreshed?.lastLoginAt).not.toBeNull();
  });
});
