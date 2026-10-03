import { randomUUID } from 'node:crypto';
import { AppDataSource } from '../../src/core/database/data-source';
import {
  Organization,
  OrganizationPlan,
} from '../../src/modules/organizations/entities/organization.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { UserStatus } from '../../src/modules/users/types/user-status';
import { RefreshToken } from '../../src/modules/auth/entities/refresh-token.entity';
import { OtpVerification } from '../../src/modules/auth/entities/otp-verification.entity';
import { OtpPurpose } from '../../src/modules/auth/types/otp-purpose';
import { UserRoleAssignment } from '../../src/modules/authorization/entities/user-role-assignment.entity';
import { Role } from '../../src/modules/authorization/entities/role.entity';
import { ScopeType } from '../../src/modules/authorization/types/scope-type';
import { UserRepository } from '../../src/modules/users/repositories/user.repository';
import { RefreshTokenRepository } from '../../src/modules/auth/repositories/refresh-token.repository';
import { OtpVerificationRepository } from '../../src/modules/auth/repositories/otp-verification.repository';
import { UserRoleAssignmentRepository } from '../../src/modules/authorization/repositories/user-role-assignment.repository';
import { TenantScopeMissingError } from '../../src/core/tenancy/tenant-scope.error';

describe('Cross-Tenant Isolation Integration Test (*.int-spec.ts)', () => {
  let userRepo: UserRepository;
  let refreshRepo: RefreshTokenRepository;
  let otpRepo: OtpVerificationRepository;
  let assignmentRepo: UserRoleAssignmentRepository;

  let orgA: Organization;
  let orgB: Organization;
  let userA: User;
  let tokenA: RefreshToken;
  let otpA: OtpVerification;
  let roleA: Role;
  let assignmentA: UserRoleAssignment;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    userRepo = new UserRepository(AppDataSource);
    refreshRepo = new RefreshTokenRepository(AppDataSource);
    otpRepo = new OtpVerificationRepository(AppDataSource);
    assignmentRepo = new UserRoleAssignmentRepository(AppDataSource);

    const orgRepo = AppDataSource.getRepository(Organization);
    const roleRepo = AppDataSource.getRepository(Role);

    // Create Org A and Org B
    orgA = await orgRepo.save(
      orgRepo.create({
        name: 'Org A IntTest',
        slug: `org-a-${Date.now()}`,
        timezone: 'UTC',
        plan: OrganizationPlan.Free,
      }),
    );

    orgB = await orgRepo.save(
      orgRepo.create({
        name: 'Org B IntTest',
        slug: `org-b-${Date.now()}`,
        timezone: 'UTC',
        plan: OrganizationPlan.Free,
      }),
    );

    // Create User in Org A
    userA = await userRepo.createUser({
      organizationId: orgA.id,
      email: `usera-${Date.now()}@example.com`,
      fullName: 'User A',
      status: UserStatus.Active,
      passwordHash: 'hash',
    });

    // Create Refresh Token in Org A
    tokenA = await refreshRepo.saveToken({
      organizationId: orgA.id,
      userId: userA.id,
      familyId: randomUUID(),
      tokenHash: 'hash-a',
      expiresAt: new Date(Date.now() + 3600000),
    });

    // Create OTP Verification in Org A
    otpA = await otpRepo.saveOtp({
      organizationId: orgA.id,
      userId: userA.id,
      purpose: OtpPurpose.Login,
      codeHash: 'otphash-a',
      attempts: 0,
      expiresAt: new Date(Date.now() + 600000),
    });

    // Find or create a role
    let existingRole = await roleRepo.findOne({ where: { key: 'org_member' } });
    if (!existingRole) {
      existingRole = await roleRepo.save(
        roleRepo.create({
          key: 'org_member',
          name: 'Org Member',
          description: 'Member role',
          isSystem: true,
        }),
      );
    }
    roleA = existingRole;

    // Create UserRoleAssignment in Org A
    assignmentA = await assignmentRepo.saveAssignment(orgA.id, {
      userId: userA.id,
      roleId: roleA.id,
      scopeType: ScopeType.Organization,
      scopeId: orgA.id,
    });
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      const orgRepo = AppDataSource.getRepository(Organization);
      await AppDataSource.getRepository(UserRoleAssignment).delete({ organizationId: orgA.id });
      await AppDataSource.getRepository(OtpVerification).delete({ organizationId: orgA.id });
      await AppDataSource.getRepository(RefreshToken).delete({ organizationId: orgA.id });
      await AppDataSource.getRepository(User).delete({ organizationId: orgA.id });
      await orgRepo.delete({ id: orgA.id });
      await orgRepo.delete({ id: orgB.id });
      await AppDataSource.destroy();
    }
  });

  describe('UserRepository Cross-Tenant Protection', () => {
    it('findByIdInOrg returns null when querying Org A user under Org B context', async () => {
      const result = await userRepo.findByIdInOrg(orgB.id, userA.id);
      expect(result).toBeNull();
    });

    it('listPage returns 0 users from Org A when queried under Org B context', async () => {
      const result = await userRepo.listPage(orgB.id, { limit: 10 });
      expect(result.users.some((u) => u.id === userA.id)).toBe(false);
    });

    it('createUser throws TenantScopeMissingError when saving an entity ID', async () => {
      await expect(
        userRepo.createUser({
          id: userA.id,
          organizationId: orgB.id,
          fullName: 'Hacked Name',
        }),
      ).rejects.toThrow(TenantScopeMissingError);
    });

    it('updateLastLogin affects 0 rows when called with Org B context for Org A user', async () => {
      await userRepo.updateLastLogin(orgB.id, userA.id);
      const freshUserA = await userRepo.findByIdInOrg(orgA.id, userA.id);
      expect(freshUserA?.lastLoginAt).toBeNull();
    });
  });

  describe('RefreshTokenRepository Cross-Tenant Protection', () => {
    it('saveToken throws TenantScopeMissingError when saving token ID belonging to Org A under Org B context', async () => {
      await expect(
        refreshRepo.saveToken({
          id: tokenA.id,
          organizationId: orgB.id,
          userId: userA.id,
          familyId: randomUUID(),
          tokenHash: 'hacked-hash',
          expiresAt: new Date(),
        }),
      ).rejects.toThrow(TenantScopeMissingError);
    });

    it('revokeFamily affects 0 rows when Org B context attempts to revoke Org A family', async () => {
      await refreshRepo.revokeFamily(orgB.id, tokenA.familyId);
      const freshTokenA = await refreshRepo.findByJti(tokenA.id);
      expect(freshTokenA?.revokedAt).toBeNull();
    });

    it('revokeAllForUser affects 0 rows when Org B context attempts to revoke Org A user tokens', async () => {
      await refreshRepo.revokeAllForUser(orgB.id, userA.id);
      const freshTokenA = await refreshRepo.findByJti(tokenA.id);
      expect(freshTokenA?.revokedAt).toBeNull();
    });
  });

  describe('OtpVerificationRepository Cross-Tenant Protection', () => {
    it('findLatestActive returns null when querying Org A OTP under Org B context', async () => {
      const result = await otpRepo.findLatestActive(orgB.id, userA.id, otpA.purpose);
      expect(result).toBeNull();
    });

    it('consumeOtp affects 0 rows when called with Org B context for Org A OTP', async () => {
      await otpRepo.consumeOtp(orgB.id, otpA.id);
      const freshOtp = await otpRepo.findLatestActive(orgA.id, userA.id, otpA.purpose);
      expect(freshOtp?.consumedAt).toBeNull();
    });

    it('saveOtp throws TenantScopeMissingError when saving OTP ID belonging to Org A under Org B context', async () => {
      await expect(
        otpRepo.saveOtp({
          id: otpA.id,
          organizationId: orgB.id,
          userId: userA.id,
          purpose: OtpPurpose.Login,
          codeHash: 'hacked',
          attempts: 5,
          expiresAt: new Date(),
        }),
      ).rejects.toThrow(TenantScopeMissingError);
    });
  });

  describe('UserRoleAssignmentRepository Cross-Tenant Protection', () => {
    it('findAssignmentsForUsers returns [] when querying Org A user under Org B context', async () => {
      const result = await assignmentRepo.findAssignmentsForUsers(orgB.id, [userA.id]);
      expect(result).toEqual([]);
    });

    it('findAssignmentById returns null when querying Org A assignment under Org B context', async () => {
      const result = await assignmentRepo.findAssignmentById(orgB.id, userA.id, assignmentA.id);
      expect(result).toBeNull();
    });

    it('findGrantsByUserId returns [] when querying Org A grants under Org B context', async () => {
      const result = await assignmentRepo.findGrantsByUserId(orgB.id, userA.id);
      expect(result).toEqual([]);
    });

    it('softDeleteAssignment affects 0 rows when called with Org B context for Org A assignment', async () => {
      await assignmentRepo.softDeleteAssignment(orgB.id, assignmentA.id);
      const result = await assignmentRepo.findAssignmentById(orgA.id, userA.id, assignmentA.id);
      expect(result).not.toBeNull();
    });
  });
});
