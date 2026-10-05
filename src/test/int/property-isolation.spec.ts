import { PropertyFixture } from '../e2e/property-fixture';
import type { FixtureAccount } from '../e2e/identity-fixture';
import type { PropertyRecord } from '../../shared/property.types';
import { PropertyRepository } from '../../modules/properties';
import { InvitationRepository } from '../../modules/organizations';
import { InvitationToken } from '../../integrations/invitation-token/invitation-token.contract';
import { TransactionRunner } from '../../core/database/transaction-runner.contract';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import { verifyIsolation } from './isolation-harness';
import { propertyReadCases, propertyWriteCases } from './property-isolation-cases';
import { inviteReadCases, inviteWriteCases } from './invite-isolation-cases';
const f = new PropertyFixture();
let a: FixtureAccount;
let b: FixtureAccount;
let property: PropertyRecord;
let other: PropertyRecord;
beforeAll(async () => {
  await f.start();
  a = await f.account();
  b = await f.account();
  property = await f.property(a);
  other = await f.property(b);
});
afterAll(() => f.close());
it('reflection covers every property repository method and composite-FK isolation', async () => {
  const context = {
    repo: f.app.get(PropertyRepository),
    org: a.me.organization.id,
    foreign: b.me.organization.id,
    property,
    other,
  };
  await verifyIsolation(context.repo, {
    ...propertyReadCases(context),
    ...propertyWriteCases(context),
  });
});
it('reflection covers every invitation method including the explicit hashed bearer lookup', async () => {
  const invite = await f.invite(a);
  const context = {
    repo: f.app.get(InvitationRepository),
    org: a.me.organization.id,
    foreign: b.me.organization.id,
    inviter: a.me.user.id,
    id: invite.record.id,
    token: invite.token,
    crypto: f.app.get(InvitationToken),
    tx: f.app.get(TransactionRunner),
    foreignProperty: other.id,
  };
  await verifyIsolation(context.repo, {
    ...inviteReadCases(context),
    ...inviteWriteCases(context),
  });
});
it('preserves PostgreSQL microseconds under tied property timestamps with bounded cursor traversal', async () => {
  const repo = f.app.get(PropertyRepository);
  const org = a.me.organization.id;
  const ids: string[] = [];
  for (let index = 0; index < 35; index++)
    ids.push(
      (
        await repo.create(org, {
          name: 'Page fixture',
          type: 'HOTEL',
          addressLine1: 'Fixture',
          city: 'Jaipur',
          state: 'RJ',
          postalCode: '302001',
        })
      ).id,
    );
  await f.app
    .get(DatabaseConnection)
    .withManager((m) =>
      m.query(
        "UPDATE properties SET created_at='2020-01-01 00:00:00.123456+00' WHERE organization_id=$1 AND id=ANY($2::uuid[])",
        [org, ids],
      ),
    );
  let cursor: string | undefined;
  const seen: string[] = [];
  for (let index = 0; index < 4; index++) {
    const page = await repo.list(org, cursor ? { cursor } : {}, undefined);
    seen.push(...page.items.map((p) => p.id));
    cursor = page.nextCursor ?? undefined;
    if (!cursor) break;
  }
  expect(cursor).toBeUndefined();
  expect(new Set(seen).size).toBe(seen.length);
  expect(ids.every((id) => seen.includes(id))).toBe(true);
});
