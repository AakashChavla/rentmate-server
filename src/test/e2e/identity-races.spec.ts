import { IdentityFixture, ORIGIN, FIXTURE_PASSWORD } from './identity-fixture';
import { SessionService } from '../../modules/auth/session.service.contract';
import { OtpService } from '../../modules/auth/otp.service.contract';
import { TokenSigner } from '../../integrations/tokens/token-signer.contract';
import { OtpGenerator } from '../../integrations/otp/otp-generator.contract';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import { UsersService } from '../../modules/users';
import { RoleRepository } from '../../modules/authorization';
import { ROLE, OTP_PURPOSE } from '../../shared/identity.constants';
const fixture = new IdentityFixture();
const metadata = { ip: 'fixture', userAgent: 'fixture' };
beforeAll(() => fixture.start());
afterAll(() => fixture.close());
beforeEach(() => fixture.resetThrottle());
function cookie(cookies: string[], name: string): string {
  return cookies.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1) ?? '';
}
it('twenty concurrent refreshes produce one replacement and grace errors; delayed reuse revokes the lineage', async () => {
  const owner = await fixture.account();
  const original = cookie(owner.cookies, 'rm_refresh');
  const sessions = fixture.app.get(SessionService);
  const results = await Promise.allSettled(
    Array.from({ length: 20 }, () => sessions.refresh(original, metadata)),
  );
  const successful = results.filter(
    (r): r is PromiseFulfilledResult<Awaited<ReturnType<SessionService['refresh']>>> =>
      r.status === 'fulfilled',
  );
  expect(successful).toHaveLength(1);
  const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  for (const result of rejected)
    expect(result.reason as unknown).toMatchObject({ code: 'TOKEN_ROTATED' });
  const claims = await fixture.app.get(TokenSigner).verify(original, true);
  const db = fixture.app.get(DatabaseConnection);
  const rows = await db.withManager((m) =>
    m.query<{ count: string }[]>(
      'SELECT count(*) FROM refresh_tokens WHERE organization_id=$1 AND family_id=$2',
      [claims.org, claims.fid],
    ),
  );
  expect(rows[0]?.count).toBe('2');
  await db.withManager((m) =>
    m.query(
      "UPDATE refresh_tokens SET revoked_at=now()-interval '20 seconds' WHERE organization_id=$1 AND user_id=$2 AND id=$3",
      [claims.org, claims.sub, claims.jti],
    ),
  );
  await expect(sessions.refresh(original, metadata)).rejects.toMatchObject({
    code: 'SESSION_REVOKED',
  });
  const access = successful[0]?.value.access ?? '';
  await fixture.http().get('/api/v1/auth/me').set('Cookie', `rm_access=${access}`).expect(401);
});
it('fifty parallel wrong OTP guesses perform at most three comparisons and cannot consume the code', async () => {
  const owner = await fixture.account();
  const otp = fixture.app.get(OtpService);
  await otp.send(owner.email, OTP_PURPOSE.LOGIN);
  const actual = fixture.mail.code(owner.email);
  const wrong = actual.slice(0, -1) + (actual.endsWith('0') ? '1' : '0');
  const generator = fixture.app.get(OtpGenerator);
  const observer = jest.spyOn(generator, 'matches');
  const results = await Promise.allSettled(
    Array.from({ length: 50 }, () => otp.consume(owner.email, wrong, OTP_PURPOSE.LOGIN)),
  );
  expect(results.every((r) => r.status === 'rejected')).toBe(true);
  expect(observer.mock.calls.length).toBeLessThanOrEqual(3);
  observer.mockRestore();
  await expect(otp.consume(owner.email, actual, OTP_PURPOSE.LOGIN)).rejects.toMatchObject({
    code: 'OTP_LOCKED',
  });
});
it('two owners removing one another serialize and leave exactly one owner', async () => {
  const owner = await fixture.account();
  const other = await fixture.member(owner, ROLE.OWNER);
  const org = owner.me.organization.id;
  const roles = fixture.app.get(RoleRepository);
  const first = (await roles.context(org, owner.me.user.id)).roles.find(
    (r) => r.role === ROLE.OWNER,
  );
  const second = (await roles.context(org, other.me.user.id)).roles.find(
    (r) => r.role === ROLE.OWNER,
  );
  expect(first).toBeDefined();
  expect(second).toBeDefined();
  const users = fixture.app.get(UsersService);
  const results = await Promise.allSettled([
    users.remove(org, owner.me.user.id, other.me.user.id, second?.id ?? ''),
    users.remove(org, other.me.user.id, owner.me.user.id, first?.id ?? ''),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  const remaining = await fixture.app
    .get(DatabaseConnection)
    .transaction(() => roles.lockOwners(org));
  expect(remaining).toHaveLength(1);
});
it('suspension blocks existing access immediately and last-owner removal returns LAST_OWNER', async () => {
  const owner = await fixture.account();
  const tenant = await fixture.member(owner);
  await fixture
    .http()
    .patch(`/api/v1/users/${tenant.me.user.id}`)
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ status: 'SUSPENDED' })
    .expect(200);
  await fixture.http().get('/api/v1/auth/me').set('Cookie', tenant.cookies).expect(401);
  const suspended = await fixture
    .http()
    .post('/api/v1/auth/login')
    .set('Origin', ORIGIN)
    .send({ email: tenant.email, password: FIXTURE_PASSWORD })
    .expect(403);
  expect((suspended.body as { error: { code: string } }).error.code).toBe('ACCOUNT_SUSPENDED');
  const assignment = owner.me.roles.find((r) => r.role === ROLE.OWNER);
  const last = await fixture
    .http()
    .delete(`/api/v1/users/${owner.me.user.id}/roles/${assignment?.id ?? ''}`)
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .expect(409);
  expect((last.body as { error: { code: string } }).error.code).toBe('LAST_OWNER');
});
