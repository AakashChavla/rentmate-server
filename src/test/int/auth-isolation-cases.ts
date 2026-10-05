import { randomUUID } from 'node:crypto';
import type { IsolationCase } from './isolation-harness';
import { OTP_PURPOSE, CONSENT } from '../../shared/identity.constants';
import type { AuthRepository } from '../../modules/auth/repositories/auth.repository.contract';
import type { RefreshRecord, OtpRecord } from '../../shared/identity.types';
import type { OrganizationRepository } from '../../modules/organizations';
interface Scope {
  repo: AuthRepository;
  org: string;
  foreign: string;
  user: string;
  token: RefreshRecord;
  otp: OtpRecord;
  email: string;
  refreshRecord: (org: string, user: string) => RefreshRecord;
  organization: OrganizationRepository;
}
export function authCases0(scope: Scope): Record<string, IsolationCase> {
  const { repo, org, foreign, user, token, email, refreshRecord } = scope;
  return {
    findIdentity: async () => {
      expect((await repo.findIdentity(email.toUpperCase()))?.user.organizationId).toBe(org);
      expect(await repo.findIdentity(`unknown-${randomUUID()}@fixture.rentmate.test`)).toBeNull();
    },
    createRefresh: async () => {
      await expect(repo.createRefresh(refreshRecord(foreign, user))).rejects.toThrow();
    },
    refresh: async () => {
      expect(await repo.refresh(foreign, user, token.id)).toBeNull();
      expect(await repo.refresh(org, user, token.id)).not.toBeNull();
    },
    rotate: async () => {
      expect(
        await repo.rotate(foreign, user, token.id, refreshRecord(foreign, user), new Date()),
      ).toBe(false);
      expect((await repo.refresh(org, user, token.id))?.revokedAt).toBeNull();
    },
  };
}
export function authCases1(scope: Scope): Record<string, IsolationCase> {
  const { repo, org, foreign, user, token, otp } = scope;
  return {
    revokeFamily: async () => {
      await repo.revokeFamily(foreign, user, token.familyId, new Date());
      expect((await repo.refresh(org, user, token.id))?.revokedAt).toBeNull();
    },
    revokeUser: async () => {
      expect(await repo.revokeUser(foreign, user, new Date())).toEqual([]);
      expect((await repo.refresh(org, user, token.id))?.revokedAt).toBeNull();
    },
    createOtp: async () => {
      await expect(
        repo.createOtp({ ...otp, id: randomUUID(), organizationId: foreign }),
      ).rejects.toThrow();
    },
    latestOtp: async () => {
      expect(await repo.latestOtp(foreign, user, OTP_PURPOSE.LOGIN)).toBeNull();
      expect((await repo.latestOtp(org, user, OTP_PURPOSE.LOGIN))?.id).toBe(otp.id);
    },
  };
}
export function authCases2(scope: Scope): Record<string, IsolationCase> {
  const { repo, org, foreign, user, otp, email, organization } = scope;
  return {
    consumeOtp: async () => {
      expect(await repo.consumeOtp(foreign, user, otp.id, new Date())).toBe(false);
      expect((await repo.latestOtp(org, user, OTP_PURPOSE.LOGIN))?.consumedAt).toBeNull();
    },
    consent: async () => {
      await expect(
        repo.consent(
          foreign,
          user,
          {
            email: email,
            password: 'fixture-password',
            fullName: 'Fixture',
            organizationName: 'Fixture',
            locale: 'en',
            acceptTerms: true,
            termsVersion: CONSENT.VERSION,
          },
          '127.0.0.1',
          new Date(),
        ),
      ).rejects.toThrow();
    },
    cleanup: async () => {
      await repo.cleanup(new Date());
      expect(await organization.get(org)).not.toBeNull();
      expect(await organization.get(foreign)).not.toBeNull();
    },
  };
}
