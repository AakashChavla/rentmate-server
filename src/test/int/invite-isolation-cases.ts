import { randomUUID } from 'node:crypto';
import { InvitationRepository } from '../../modules/organizations';
import { InvitationToken } from '../../integrations/invitation-token/invitation-token.contract';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import type { InviteRecord } from '../../shared/property.types';
import type { IsolationCase } from './isolation-harness';
interface Context {
  repo: InvitationRepository;
  org: string;
  foreign: string;
  inviter: string;
  id: string;
  token: string;
  crypto: InvitationToken;
  tx: TransactionRunner;
  foreignProperty: string;
}
function input(c: Context): Omit<InviteRecord, 'id' | 'createdAt' | 'organizationId'> {
  return {
    email: 'reflect-' + randomUUID() + '@fixture.rentmate.test',
    roleId: 'TENANT',
    scopeType: 'ORGANIZATION',
    scopeId: c.org,
    propertyId: null,
    tokenHash: c.crypto.digest(c.crypto.generate()),
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 604800000),
    invitedBy: c.inviter,
    locale: 'en',
  };
}
export function inviteReadCases(c: Context): Record<string, IsolationCase> {
  return {
    get: async () => {
      expect(await c.repo.get(c.foreign, c.id)).toBeNull();
      expect((await c.repo.get(c.org, c.id))?.id).toBe(c.id);
    },
    lock: async () => {
      await c.tx.run(async () => {
        expect(await c.repo.lock(c.foreign, c.id)).toBeNull();
        expect((await c.repo.lock(c.org, c.id))?.id).toBe(c.id);
      });
    },
    findByDigest: async () => {
      expect(await c.repo.findByDigest(c.crypto.digest('unknown'))).toBeNull();
      expect((await c.repo.findByDigest(c.crypto.digest(c.token)))?.organizationId).toBe(c.org);
    },
    list: async () => {
      expect((await c.repo.list(c.foreign, {}, undefined)).items.map((i) => i.id)).not.toContain(
        c.id,
      );
      expect((await c.repo.list(c.org, {}, [c.foreignProperty])).items).toEqual([]);
    },
  };
}
export function inviteWriteCases(c: Context): Record<string, IsolationCase> {
  return {
    create: async () => {
      await expect(c.repo.create(c.foreign, { ...input(c), scopeId: c.foreign })).rejects.toThrow();
      await expect(
        c.repo.create(c.org, {
          ...input(c),
          scopeType: 'PROPERTY',
          scopeId: c.foreignProperty,
          propertyId: c.foreignProperty,
        }),
      ).rejects.toThrow();
      const made = await c.repo.create(c.org, input(c));
      expect(await c.repo.get(c.foreign, made.id)).toBeNull();
    },
    pending: async () => {
      const original = await c.repo.get(c.org, c.id);
      if (!original) throw new Error('Fixture missing');
      expect(await c.repo.pending(c.foreign, original.email, new Date())).toBe(false);
      expect(await c.repo.pending(c.org, original.email, new Date())).toBe(true);
    },
    rotate: async () => {
      const hash = c.crypto.digest(c.crypto.generate());
      await expect(c.repo.rotate(c.foreign, c.id, hash, new Date())).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
      expect(await c.repo.findByDigest(c.crypto.digest(c.token))).not.toBeNull();
      await c.repo.rotate(c.org, c.id, hash, new Date(Date.now() + 604800000));
      expect((await c.repo.findByDigest(hash))?.organizationId).toBe(c.org);
    },
    transition: async () => {
      expect(await c.repo.transition(c.foreign, c.id, 'PENDING', 'ACCEPTED')).toBe(false);
      expect(await c.repo.transition(c.org, c.id, 'PENDING', 'REVOKED')).toBe(true);
      expect((await c.repo.get(c.org, c.id))?.status).toBe('REVOKED');
    },
  };
}
