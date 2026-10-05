import { randomUUID } from 'node:crypto';
import { IdentityFixture, type FixtureAccount } from '../e2e/identity-fixture';
import { verifyIsolation } from './isolation-harness';
import { UserRepository } from '../../modules/users';
import { OrganizationRepository } from '../../modules/organizations';
import { RoleRepository } from '../../modules/authorization';
import { AuthRepository } from '../../modules/auth/repositories/auth.repository.contract';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import { ROLE, OTP_PURPOSE, USER_STATUS, IDENTITY_TTL } from '../../shared/identity.constants';
import type { RefreshRecord } from '../../shared/identity.types';
import { userCases0, userCases1 } from './user-isolation-cases';
import { authCases0, authCases1, authCases2 } from './auth-isolation-cases';

const fixture = new IdentityFixture();
let a: FixtureAccount;
let b: FixtureAccount;
beforeAll(async () => {
  await fixture.start();
  a = await fixture.account();
  b = await fixture.account();
});
afterAll(async () => {
  await fixture.close();
});
it('reflects every user repository method and verifies scoped reads and targeted writes', async () => {
  const repo = fixture.app.get(UserRepository);
  const org = a.me.organization.id;
  const foreign = b.me.organization.id;
  const user = a.me.user.id;
  await verifyIsolation(repo, {
    ...userCases0({ repo, org, foreign, user }),
    ...userCases1({ repo, org, foreign, user }),
  });
});
it('reflects role repository methods, rejects composite-FK tenant spoofing and isolates assignments', async () => {
  const repo = fixture.app.get(RoleRepository);
  const org = a.me.organization.id;
  const foreign = b.me.organization.id;
  const user = a.me.user.id;
  const owner = a.me.roles[0];
  if (!owner) throw new Error('Fixture owner missing');
  await verifyIsolation(repo, {
    context: async () => {
      expect((await repo.context(foreign, user)).roles).toEqual([]);
      expect((await repo.context(org, user)).roles.length).toBeGreaterThan(0);
    },
    forUsers: async () => {
      expect(await repo.forUsers(foreign, [user])).toEqual([]);
      expect((await repo.forUsers(org, [user])).length).toBeGreaterThan(0);
    },
    assign: async () => {
      await expect(repo.assign(foreign, user, ROLE.MANAGER)).rejects.toThrow();
      await repo.assign(org, user, ROLE.MANAGER);
    },
    remove: async () => {
      await repo.remove(foreign, user, owner.id);
      expect((await repo.context(org, user)).roles.some((role) => role.id === owner.id)).toBe(true);
    },
    lockOwners: async () => {
      await fixture.app.get(TransactionRunner).run(async () => {
        expect(await repo.lockOwners(foreign)).not.toContain(user);
        expect(await repo.lockOwners(org)).toContain(user);
      });
    },
    roles: async () => {
      expect(await repo.roles()).toContain(ROLE.OWNER);
    },
    permissions: async () => {
      expect(await repo.permissions()).toContain('user:read');
    },
  });
});
it('reflects organization methods; only the explicitly addressed organization is activated', async () => {
  const repo = fixture.app.get(OrganizationRepository);
  const org = a.me.organization.id;
  await verifyIsolation(repo, {
    get: async () => {
      expect((await repo.get(org))?.id).toBe(org);
      expect(await repo.get(randomUUID())).toBeNull();
    },
    create: async () => {
      const created = await repo.create('Isolated create', randomUUID(), 'en');
      await fixture.app
        .get(DatabaseConnection)
        .withManager((m) => m.query('DELETE FROM organizations WHERE id=$1', [created.id]));
      expect(created.id).not.toBe(org);
    },
    update: async () => {
      await repo.update(org, { name: 'Scoped organization update' });
      expect((await repo.get(b.me.organization.id))?.name).not.toBe('Scoped organization update');
    },
    activate: async () => {
      await repo.activate(randomUUID());
      expect((await repo.get(org))?.isActive).toBe(true);
    },
  });
});
function refreshRecord(org: string, user: string): RefreshRecord {
  return {
    id: randomUUID(),
    organizationId: org,
    userId: user,
    familyId: randomUUID(),
    tokenHash: 'fixture-hash',
    revokedAt: null,
    replacedById: null,
    expiresAt: new Date(Date.now() + 60000),
    ip: '127.0.0.1',
    userAgent: 'fixture',
  };
}
it('reflects every session/OTP repository method including global entrypoints and tenant composite FKs', async () => {
  const repo = fixture.app.get(AuthRepository);
  const org = a.me.organization.id;
  const foreign = b.me.organization.id;
  const user = a.me.user.id;
  const token = refreshRecord(org, user);
  const otp = {
    id: randomUUID(),
    organizationId: org,
    userId: user,
    purpose: OTP_PURPOSE.LOGIN,
    codeHash: 'fixture-hmac',
    expiresAt: new Date(Date.now() + 60000),
    consumedAt: null,
  };
  await repo.createRefresh(token);
  await repo.createOtp(otp);
  const scope = {
    repo,
    org,
    foreign,
    user,
    token,
    otp,
    email: a.email,
    refreshRecord,
    organization: fixture.app.get(OrganizationRepository),
  };
  await verifyIsolation(repo, { ...authCases0(scope), ...authCases1(scope), ...authCases2(scope) });
});
it('rolls back joined registration writes and discards after-commit effects on failure', async () => {
  const runner = fixture.app.get(TransactionRunner);
  const repo = fixture.app.get(OrganizationRepository);
  let created: string | undefined;
  const effect = jest.fn(() => Promise.resolve());
  await expect(
    runner.run(async () => {
      created = (await repo.create('Rollback fixture', randomUUID(), 'en')).id;
      await runner.afterCommit(effect);
      throw new Error('Fixture rollback');
    }),
  ).rejects.toThrow('Fixture rollback');
  expect(effect).not.toHaveBeenCalled();
  if (!created) throw new Error('Fixture creation failed');
  expect(await repo.get(created)).toBeNull();
  await runner.run(async () => {
    await runner.afterCommit(effect);
    expect(effect).not.toHaveBeenCalled();
  });
  expect(effect).toHaveBeenCalledTimes(1);
});

it('cleans only expired unverified registrations while preserving active users', async () => {
  const organizations = fixture.app.get(OrganizationRepository);
  const users = fixture.app.get(UserRepository);
  const db = fixture.app.get(DatabaseConnection);
  const ids: string[] = [];
  try {
    for (const status of [USER_STATUS.PENDING, USER_STATUS.ACTIVE]) {
      const org = await organizations.create('Retention fixture', randomUUID(), 'en');
      ids.push(org.id);
      await users.createInOrg(
        org.id,
        {
          email: `retention-${randomUUID()}@fixture.rentmate.test`,
          fullName: 'Retention',
          phone: null,
          locale: 'en',
          status,
          isPlatformAdmin: false,
        },
        'fixture-hash',
      );
      await db.withManager((m) =>
        m.query("UPDATE organizations SET created_at=now()-interval '73 hours' WHERE id=$1", [
          org.id,
        ]),
      );
    }
    await fixture.app.get(AuthRepository).cleanup(new Date(Date.now() - IDENTITY_TTL.REGISTRATION));
    const [pending, active] = ids;
    if (!pending || !active) throw new Error('Retention fixtures missing');
    expect(await organizations.get(pending)).toBeNull();
    expect(await organizations.get(active)).not.toBeNull();
  } finally {
    for (const id of ids)
      await db.withManager((m) => m.query('DELETE FROM organizations WHERE id=$1', [id]));
  }
});
it('rolls back OTP consumption, password replacement and session revocation together', async () => {
  const repo = fixture.app.get(AuthRepository);
  const users = fixture.app.get(UserRepository);
  const runner = fixture.app.get(TransactionRunner);
  const org = a.me.organization.id;
  const user = a.me.user.id;
  const original = (await repo.findIdentity(a.email))?.passwordHash;
  const token = refreshRecord(org, user);
  const otp = {
    id: randomUUID(),
    organizationId: org,
    userId: user,
    purpose: OTP_PURPOSE.RESET,
    codeHash: 'fixture-hmac',
    expiresAt: new Date(Date.now() + IDENTITY_TTL.OTP),
    consumedAt: null,
  };
  await repo.createRefresh(token);
  await repo.createOtp(otp);
  await expect(
    runner.run(async () => {
      expect(await repo.consumeOtp(org, user, otp.id, new Date())).toBe(true);
      await users.setPasswordHash(org, user, 'replacement-fixture');
      await repo.revokeUser(org, user, new Date());
      throw new Error('Rollback fixture');
    }),
  ).rejects.toThrow('Rollback fixture');
  expect((await repo.latestOtp(org, user, OTP_PURPOSE.RESET))?.id).toBe(otp.id);
  expect((await repo.findIdentity(a.email))?.passwordHash).toBe(original);
  expect((await repo.refresh(org, user, token.id))?.revokedAt).toBeNull();
});

it('paginates tied PostgreSQL microsecond timestamps without duplicates or skipped users', async () => {
  const repo = fixture.app.get(UserRepository);
  const org = a.me.organization.id;
  const ids: string[] = [];
  for (let index = 0; index < 40; index++) {
    const inserted = await repo.createInOrg(
      org,
      {
        email: `page-${randomUUID()}@fixture.rentmate.test`,
        fullName: 'Pagination fixture',
        phone: null,
        locale: 'en',
        status: USER_STATUS.ACTIVE,
        isPlatformAdmin: false,
      },
      'fixture-hash',
    );
    ids.push(inserted.id);
  }
  await fixture.app
    .get(DatabaseConnection)
    .withManager((m) =>
      m.query(
        "UPDATE users SET created_at='2020-01-01 00:00:00.123456+00' WHERE organization_id=$1 AND id=ANY($2::uuid[])",
        [org, ids],
      ),
    );
  const seen: string[] = [];
  let cursor: string | undefined;
  for (let pageIndex = 0; pageIndex < 4; pageIndex++) {
    const page = await repo.listInOrg(org, cursor, undefined, undefined);
    seen.push(...page.items.map((user) => user.id));
    cursor = page.nextCursor ?? undefined;
    if (!cursor) break;
  }
  expect(cursor).toBeUndefined();
  expect(new Set(seen).size).toBe(seen.length);
  expect(ids.every((id) => seen.includes(id))).toBe(true);
  await expect(
    repo.listInOrg(
      org,
      Buffer.from(JSON.stringify({ time: '2026-invalid', id: randomUUID() })).toString('base64url'),
      undefined,
      undefined,
    ),
  ).rejects.toMatchObject({ code: 'INVALID_CURSOR' });
});
