import type { FixtureAccount } from './identity-fixture';
import { randomUUID, randomBytes } from 'node:crypto';
import { EventBus } from '../../core/events/event-bus.contract';
import { PropertyFixture } from './property-fixture';
import { ORIGIN, FIXTURE_PASSWORD } from './identity-fixture';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import { InvitationToken } from '../../integrations/invitation-token/invitation-token.contract';
import { INVITE_TOKEN } from '../../shared/property.constants';
import type { PermissionContext } from '../../shared/identity.types';
const f = new PropertyFixture();
beforeAll(() => f.start());
afterAll(() => f.close());
beforeEach(() => f.resetDomains());
function body(token: string): { token: string; fullName: string; password: string } {
  return { token, fullName: 'Invited user', password: FIXTURE_PASSWORD };
}
it('invites, accepts once and logs in with the invited role, property scope and locale', async () => {
  const publish = jest.spyOn(f.app.get(EventBus), 'publish');
  const owner = await f.account('hi');
  const property = await f.property(owner);
  const invite = await f.invite(owner, 'PROPERTY_MANAGER', property.id);
  expect(f.mail.sent.at(-1)?.locale).toBe('hi');
  await f
    .http()
    .post('/api/v1/invitations/accept')
    .set('Origin', ORIGIN)
    .send(body(invite.token))
    .expect(200);
  const login = await f
    .http()
    .post('/api/v1/auth/login')
    .set('Origin', ORIGIN)
    .send({ email: invite.email, password: FIXTURE_PASSWORD })
    .expect(200);
  const me = (login.body as { data: PermissionContext }).data;
  expect(me.user.status).toBe('ACTIVE');
  expect(me.user.locale).toBe('hi');
  expect(me.roles[0]).toMatchObject({
    role: 'PROPERTY_MANAGER',
    scope: 'PROPERTY',
    scopeId: property.id,
  });
  await f
    .http()
    .post('/api/v1/invitations/accept')
    .set('Origin', ORIGIN)
    .send(body(invite.token))
    .expect(409);
  const stored = await f.app
    .get(DatabaseConnection)
    .withManager((m) =>
      m.query<{ token_hash: string; status: string }[]>(
        'SELECT token_hash,status FROM organization_invites WHERE organization_id=$1 AND id=$2',
        [owner.me.organization.id, invite.record.id],
      ),
    );
  expect(stored[0]?.token_hash).toBe(f.app.get(InvitationToken).digest(invite.token));
  expect(stored[0]?.status).toBe('ACCEPTED');
  expect(publish).toHaveBeenCalledWith(
    'invitation.accepted',
    expect.objectContaining({
      invitationId: invite.record.id,
      organizationId: owner.me.organization.id,
    }),
  );
});
it('rejects duplicates, rotates resend tokens, revokes and consistently rejects expired invitations', async () => {
  const owner = await f.account();
  const invite = await f.invite(owner);
  await f
    .http()
    .post('/api/v1/invitations')
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ email: invite.email, roleKey: 'TENANT', scopeType: 'ORGANIZATION' })
    .expect(409);
  await f
    .http()
    .post('/api/v1/invitations/' + invite.record.id + '/resend')
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .expect(200);
  const link = f.mail.sent.at(-1)?.inviteUrl;
  if (!link) throw new Error('Fixture resend missing');
  const newToken = new URL(link).searchParams.get('token');
  if (!newToken) throw new Error('Fixture token missing');
  await f
    .http()
    .post('/api/v1/invitations/accept')
    .set('Origin', ORIGIN)
    .send(body(invite.token))
    .expect(400);
  await f
    .http()
    .delete('/api/v1/invitations/' + invite.record.id)
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .expect(200);
  await f
    .http()
    .post('/api/v1/invitations/accept')
    .set('Origin', ORIGIN)
    .send(body(newToken))
    .expect(409);
  await expireAndReject(owner);
});
it('isolates invitation endpoints and enforces owner restrictions and scoped manager invitations', async () => {
  const a = await f.account();
  const b = await f.account();
  const own = await f.property(a);
  const other = await f.property(a);
  const foreign = await f.property(b);
  const invite = await f.invite(b);
  await f
    .http()
    .post('/api/v1/invitations/' + invite.record.id + '/resend')
    .set('Cookie', a.cookies)
    .set('Origin', ORIGIN)
    .expect(404);
  await f
    .http()
    .delete('/api/v1/invitations/' + invite.record.id)
    .set('Cookie', a.cookies)
    .set('Origin', ORIGIN)
    .expect(404);
  const list = await f.http().get('/api/v1/invitations').set('Cookie', a.cookies).expect(200);
  expect((list.body as { data: unknown[] }).data).toEqual([]);
  await f
    .http()
    .post('/api/v1/invitations')
    .set('Cookie', a.cookies)
    .set('Origin', ORIGIN)
    .send({
      email: 'scope-' + randomUUID() + '@fixture.rentmate.test',
      roleKey: 'TENANT',
      scopeType: 'PROPERTY',
      scopeId: foreign.id,
    })
    .expect(404);
  const manager = await f.scoped(a, own.id);
  await f.invite(manager, 'TENANT', own.id);
  await rejectRoleDelegation(a, manager, own.id, other.id, foreign.id);
});
it('keeps the unknown-token comparison on the constant-size dummy path and checks Origin before acceptance', async () => {
  const token = randomBytes(32).toString('hex');
  const match = jest.spyOn(f.app.get(InvitationToken), 'matches');
  await f
    .http()
    .post('/api/v1/invitations/accept')
    .set('Origin', ORIGIN)
    .send(body(token))
    .expect(400);
  expect(match).toHaveBeenCalledWith(token, INVITE_TOKEN.DUMMY);
  await f
    .http()
    .post('/api/v1/invitations/accept')
    .set('Origin', 'https://untrusted.fixture.test')
    .send(body(token))
    .expect(403);
});
it('serializes parallel duplicate invitations and accepts a token only once under a race', async () => {
  const owner = await f.account();
  const email = 'race-' + randomUUID() + '@fixture.rentmate.test';
  const attempts = await Promise.all(
    Array.from({ length: 2 }, () =>
      f
        .http()
        .post('/api/v1/invitations')
        .set('Cookie', owner.cookies)
        .set('Origin', ORIGIN)
        .send({ email, roleKey: 'TENANT', scopeType: 'ORGANIZATION' }),
    ),
  );
  expect(attempts.map((r) => r.status).sort()).toEqual([201, 409]);
  const link = f.mail.sent.find((m) => m.recipient === email)?.inviteUrl;
  if (!link) throw new Error('Fixture link missing');
  const token = new URL(link).searchParams.get('token');
  if (!token) throw new Error('Fixture token missing');
  const accepted = await Promise.all(
    Array.from({ length: 2 }, () =>
      f.http().post('/api/v1/invitations/accept').set('Origin', ORIGIN).send(body(token)),
    ),
  );
  expect(accepted.map((r) => r.status).sort()).toEqual([200, 409]);
});

async function expireAndReject(owner: FixtureAccount): Promise<void> {
  const expired = await f.invite(owner);
  await f.app
    .get(DatabaseConnection)
    .withManager((m) =>
      m.query(
        "UPDATE organization_invites SET expires_at=now()-interval '1 second' WHERE organization_id=$1 AND id=$2",
        [owner.me.organization.id, expired.record.id],
      ),
    );
  for (let index = 0; index < 2; index++)
    await f
      .http()
      .post('/api/v1/invitations/accept')
      .set('Origin', ORIGIN)
      .send(body(expired.token))
      .expect(410);
}

async function rejectRoleDelegation(
  a: FixtureAccount,
  manager: FixtureAccount,
  ownId: string,
  otherId: string,
  foreignId: string,
): Promise<void> {
  for (const roleKey of ['SUPER_ADMIN', 'ORG_OWNER'])
    await f
      .http()
      .post('/api/v1/invitations')
      .set('Cookie', manager.cookies)
      .set('Origin', ORIGIN)
      .send({
        email: 'role-' + randomUUID() + '@fixture.rentmate.test',
        roleKey,
        scopeType: 'PROPERTY',
        scopeId: ownId,
      })
      .expect(403);
  await f
    .http()
    .post('/api/v1/invitations')
    .set('Cookie', manager.cookies)
    .set('Origin', ORIGIN)
    .send({
      email: 'other-' + randomUUID() + '@fixture.rentmate.test',
      roleKey: 'TENANT',
      scopeType: 'PROPERTY',
      scopeId: otherId,
    })
    .expect(403);
  await f
    .http()
    .post('/api/v1/users/' + manager.me.user.id + '/roles')
    .set('Cookie', a.cookies)
    .set('Origin', ORIGIN)
    .send({ role: 'TENANT', scope: 'PROPERTY', scopeId: foreignId })
    .expect(404);
}
