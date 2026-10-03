import { JwtService } from '@nestjs/jwt';
import { AppDataSource } from '../../src/core/database/data-source';
import { AppConfigService } from '../../src/core/config/app-config.service';
import { TransactionRunner } from '../../src/core/database/transaction-runner';
import {
  Organization,
  OrganizationPlan,
} from '../../src/modules/organizations/entities/organization.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { UserStatus } from '../../src/modules/users/types/user-status';
import { RefreshToken } from '../../src/modules/auth/entities/refresh-token.entity';
import { UserRepository } from '../../src/modules/users/repositories/user.repository';
import { RefreshTokenRepository } from '../../src/modules/auth/repositories/refresh-token.repository';
import { TokenService } from '../../src/modules/auth/services/token.service';

describe('Atomic Refresh Rotation Race Test (H2) & changePassword (H3)', () => {
  let tokenService: TokenService;
  let userRepo: UserRepository;
  let refreshRepo: RefreshTokenRepository;

  let org: Organization;
  let user: User;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const config = {
      jwtAccessSecret: 'test-access-secret-32-chars-long-1234567890',
      jwtRefreshSecret: 'test-refresh-secret-32-chars-long-1234567890',
      jwtAccessTtl: '15m',
      jwtRefreshTtl: '7d',
    } as unknown as AppConfigService;

    const jwtService = new JwtService();
    const runner = new TransactionRunner(AppDataSource);

    refreshRepo = new RefreshTokenRepository(AppDataSource);
    userRepo = new UserRepository(AppDataSource);
    tokenService = new TokenService(refreshRepo, runner, jwtService, config);

    const orgRepo = AppDataSource.getRepository(Organization);

    org = await orgRepo.save(
      orgRepo.create({
        name: 'Rotation Race Org',
        slug: `rotation-race-${Date.now()}`,
        timezone: 'UTC',
        plan: OrganizationPlan.Free,
      }),
    );

    user = await userRepo.createUser({
      organizationId: org.id,
      email: `rotationuser-${Date.now()}@example.com`,
      fullName: 'Rotation User',
      status: UserStatus.Active,
      passwordHash: 'hash',
    });
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.getRepository(RefreshToken).delete({ organizationId: org.id });
      await AppDataSource.getRepository(User).delete({ organizationId: org.id });
      await AppDataSource.getRepository(Organization).delete({ id: org.id });
      await AppDataSource.destroy();
    }
  });

  it('20 parallel refreshes with one cookie produce exactly one successor lineage and no two valid refresh tokens', async () => {
    const meta = { userAgent: 'test-agent', ip: '127.0.0.1' };
    const session = await tokenService.issue({
      userId: user.id,
      organizationId: org.id,
      meta,
    });

    const parallelRotations = Array.from({ length: 20 }, () =>
      tokenService.rotate(session.refreshToken, meta),
    );

    const results = await Promise.allSettled(parallelRotations);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(19);

    const tokens = await AppDataSource.getRepository(RefreshToken).find({
      where: { familyId: session.familyId, organizationId: org.id },
    });

    const activeTokens = tokens.filter((t) => t.revokedAt === null);
    expect(activeTokens).toHaveLength(1);
  });

  it('revokeOtherFamiliesForUser revokes all families except current fid', async () => {
    const meta = { userAgent: 'test-agent', ip: '127.0.0.1' };
    const session1 = await tokenService.issue({ userId: user.id, organizationId: org.id, meta });
    const session2 = await tokenService.issue({ userId: user.id, organizationId: org.id, meta });

    await tokenService.revokeOtherFamiliesForUser(org.id, user.id, session1.familyId);

    const family1Tokens = await AppDataSource.getRepository(RefreshToken).find({
      where: { familyId: session1.familyId, organizationId: org.id },
    });
    const family2Tokens = await AppDataSource.getRepository(RefreshToken).find({
      where: { familyId: session2.familyId, organizationId: org.id },
    });

    expect(family1Tokens.some((t) => t.revokedAt === null)).toBe(true);
    expect(family2Tokens.every((t) => t.revokedAt !== null)).toBe(true);
  });
});
