import { randomUUID } from 'node:crypto';
import type { IsolationCase } from './isolation-harness';
import { USER_STATUS } from '../../shared/identity.constants';
import type { UserRepository } from '../../modules/users';
interface Scope {
  repo: UserRepository;
  org: string;
  foreign: string;
  user: string;
}
export function userCases0(scope: Scope): Record<string, IsolationCase> {
  const { repo, org, foreign, user } = scope;
  return {
    findByIdInOrg: async () => {
      expect(await repo.findByIdInOrg(foreign, user)).toBeNull();
      expect(JSON.parse(JSON.stringify(await repo.findByIdInOrg(org, user)))).not.toHaveProperty(
        'passwordHash',
      );
    },
    createInOrg: async () => {
      const inserted = await repo.createInOrg(
        org,
        {
          email: `scope-${randomUUID()}@fixture.rentmate.test`,
          fullName: 'Scoped',
          phone: null,
          locale: 'en',
          status: USER_STATUS.ACTIVE,
          isPlatformAdmin: false,
        },
        'fixture-hash',
      );
      expect(inserted.organizationId).toBe(org);
      expect(await repo.findByIdInOrg(foreign, inserted.id)).toBeNull();
    },
    recordLoginSuccess: async () => {
      await expect(repo.recordLoginSuccess(foreign, user, new Date())).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
      await repo.recordLoginSuccess(org, user, new Date());
    },
    setPasswordHash: async () => {
      await expect(repo.setPasswordHash(foreign, user, 'stolen')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
      await repo.setPasswordHash(org, user, 'fixture-hash');
    },
  };
}
export function userCases1(scope: Scope): Record<string, IsolationCase> {
  const { repo, org, foreign, user } = scope;
  return {
    updateProfile: async () => {
      await expect(repo.updateProfile(foreign, user, { fullName: 'stolen' })).rejects.toMatchObject(
        { code: 'NOT_FOUND' },
      );
      await repo.updateProfile(org, user, { fullName: 'Updated' });
    },
    setStatus: async () => {
      await expect(repo.setStatus(foreign, user, USER_STATUS.SUSPENDED)).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
      expect((await repo.findByIdInOrg(org, user))?.status).toBe(USER_STATUS.ACTIVE);
    },
    verifyEmail: async () => {
      await expect(repo.verifyEmail(foreign, user, new Date())).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
      await repo.verifyEmail(org, user, new Date());
    },
    listInOrg: async () => {
      const result = await repo.listInOrg(foreign, undefined, undefined, undefined);
      expect(result.items.every((item) => item.organizationId === foreign)).toBe(true);
      expect(result.items.some((item) => item.id === user)).toBe(false);
    },
  };
}
