import { IdentityFixture, ORIGIN, FIXTURE_PASSWORD } from './identity-fixture';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import { CONSENT, ROLE, USER_STATUS } from '../../shared/identity.constants';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { HTTP_METADATA } from '../../core/http/http.decorators';
import {
  AUTHENTICATED_METADATA,
  PERMISSIONS_METADATA,
} from '../../modules/authorization/permission.decorators';
import { SessionService } from '../../modules/auth/session.service.contract';
import { AuthService } from '../../modules/auth/auth.service.contract';
import type { PermissionContext } from '../../shared/identity.types';
const fixture = new IdentityFixture();
beforeAll(() => fixture.start());
afterAll(() => fixture.close());
beforeEach(() => fixture.resetThrottle());
it('registers, verifies, returns identity and three secure cookie definitions without secrets', async () => {
  const owner = await fixture.account('hi');
  const response = await fixture
    .http()
    .get('/api/v1/auth/me')
    .set('Cookie', owner.cookies)
    .expect(200);
  const me = (response.body as { data: PermissionContext }).data;
  expect(me.user.locale).toBe('hi');
  expect(me.roles.map((r) => r.role)).toContain(ROLE.OWNER);
  expect(me.permissions).toContain('user:read');
  expect(owner.cookies).toHaveLength(3);
  expect(JSON.stringify(response.body)).not.toMatch(
    /passwordHash|password_hash|tokenHash|code_hash/,
  );
  const duplicate = await fixture
    .http()
    .post('/api/v1/auth/register')
    .set('Origin', ORIGIN)
    .send({
      fullName: 'Duplicate',
      email: owner.email,
      password: FIXTURE_PASSWORD,
      organizationName: 'No second org',
      locale: 'en',
      acceptTerms: true,
      termsVersion: CONSENT.VERSION,
    })
    .expect(202);
  expect((duplicate.body as { data: unknown }).data).toEqual({ accepted: true });
  expect(fixture.mail.sent.filter((m) => m.recipient === owner.email).at(-1)?.purpose).toBe(
    'account-exists',
  );
  const rows = await fixture.app
    .get(DatabaseConnection)
    .withManager((m) =>
      m.query<{ count: string }[]>('SELECT count(*) FROM users WHERE email=$1', [owner.email]),
    );
  expect(rows[0]?.count).toBe('1');
});
it('denies anonymous and tenant access, prevents cross-org IDOR and enforces assignment constraints', async () => {
  await fixture.http().get('/api/v1/auth/me').expect(401);
  const owner = await fixture.account();
  const other = await fixture.account();
  const tenant = await fixture.member(owner);
  await fixture
    .http()
    .get(`/api/v1/users/${other.me.user.id}`)
    .set('Cookie', owner.cookies)
    .expect(404);
  await fixture.http().get('/api/v1/users').set('Cookie', tenant.cookies).expect(403);
  const property = await fixture
    .http()
    .post(`/api/v1/users/${tenant.me.user.id}/roles`)
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ role: ROLE.MANAGER, scope: 'PROPERTY' })
    .expect(422);
  expect((property.body as { error: { code: string } }).error.code).toBe('NOT_SUPPORTED_YET');
  await fixture
    .http()
    .post(`/api/v1/users/${tenant.me.user.id}/roles`)
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ role: ROLE.SUPER_ADMIN, scope: 'ORGANIZATION' })
    .expect(403);
  await fixture
    .http()
    .patch(`/api/v1/users/${owner.me.user.id}`)
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ status: USER_STATUS.SUSPENDED })
    .expect(403);
});
it('logout works with only the refresh cookie and immediately blocks the earlier access token', async () => {
  const owner = await fixture.account();
  const refresh = owner.cookies.filter((c) => c.startsWith('rm_refresh='));
  const response = await fixture
    .http()
    .post('/api/v1/auth/logout')
    .set('Cookie', refresh)
    .set('Origin', ORIGIN)
    .expect(200);
  expect(response.headers['set-cookie']).toHaveLength(3);
  const blocked = await fixture
    .http()
    .get('/api/v1/auth/me')
    .set('Cookie', owner.cookies)
    .expect(401);
  expect((blocked.body as { error: { code: string } }).error.code).toBe('SESSION_REVOKED');
});
it('warm auth context makes zero database calls and profile updates refresh localization', async () => {
  const owner = await fixture.account();
  const db = fixture.app.get(DatabaseConnection);
  const observer = jest.spyOn(db, 'withManager');
  await fixture.http().get('/api/v1/auth/me').set('Cookie', owner.cookies).expect(200);
  expect(observer).not.toHaveBeenCalled();
  observer.mockRestore();
  await fixture
    .http()
    .patch('/api/v1/users/me')
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ fullName: 'Updated owner', locale: 'hi' })
    .expect(200);
  const response = await fixture
    .http()
    .get('/api/v1/auth/me')
    .set('Cookie', owner.cookies)
    .expect(200);
  expect((response.body as { data: PermissionContext }).data.user.fullName).toBe('Updated owner');
  expect((response.body as { data: PermissionContext }).data.user.locale).toBe('hi');
});
it('password change retains the current family and revokes every other family; reset revokes all', async () => {
  const owner = await fixture.account();
  const sessions = fixture.app.get(SessionService);
  const other = await fixture.app
    .get(AuthService)
    .login(owner.email, FIXTURE_PASSWORD, { ip: 'fixture', userAgent: 'fixture' });
  await fixture
    .http()
    .post('/api/v1/auth/password/change')
    .set('Cookie', owner.cookies)
    .set('Origin', ORIGIN)
    .send({ currentPassword: FIXTURE_PASSWORD, password: 'NewFixturePassword123' })
    .expect(200);
  await fixture.http().get('/api/v1/auth/me').set('Cookie', owner.cookies).expect(200);
  await expect(
    sessions.refresh(other.tokens.refresh, { ip: 'fixture', userAgent: 'fixture' }),
  ).rejects.toMatchObject({ code: 'SESSION_REVOKED' });
  await fixture
    .http()
    .post('/api/v1/auth/password/forgot')
    .set('Origin', ORIGIN)
    .send({ email: owner.email })
    .expect(202);
  await fixture
    .http()
    .post('/api/v1/auth/password/reset')
    .set('Origin', ORIGIN)
    .send({
      email: owner.email,
      code: fixture.mail.code(owner.email),
      password: 'ResetFixturePassword123',
    })
    .expect(200);
  await fixture.http().get('/api/v1/auth/me').set('Cookie', owner.cookies).expect(401);
  await fixture
    .http()
    .post('/api/v1/auth/login')
    .set('Origin', ORIGIN)
    .send({ email: owner.email, password: 'ResetFixturePassword123' })
    .expect(200);
});
it('OTP login creates cookies, unknown-email forgot remains neutral and Origin checks reject unsafe calls', async () => {
  const owner = await fixture.account();
  await fixture
    .http()
    .post('/api/v1/auth/otp/send')
    .set('Origin', ORIGIN)
    .send({ email: owner.email })
    .expect(202);
  await fixture
    .http()
    .post('/api/v1/auth/otp/verify')
    .set('Origin', ORIGIN)
    .send({ email: owner.email, code: fixture.mail.code(owner.email) })
    .expect(200);
  const unknown = await fixture
    .http()
    .post('/api/v1/auth/password/forgot')
    .set('Origin', ORIGIN)
    .send({ email: 'missing@fixture.rentmate.test' })
    .expect(202);
  expect((unknown.body as { data: unknown }).data).toEqual({ accepted: true });
  await fixture
    .http()
    .post('/api/v1/auth/login')
    .send({ email: owner.email, password: FIXTURE_PASSWORD })
    .expect(403);
});
it('every registered non-public controller route explicitly declares authentication or permissions', () => {
  const discovery = fixture.app.get(DiscoveryService);
  const reflector = fixture.app.get(Reflector);
  let count = 0;
  for (const wrapper of discovery.getControllers()) {
    const controller = wrapper.metatype;
    if (!controller) continue;
    const prototype = controller.prototype as Record<string, unknown>;
    for (const key of Object.getOwnPropertyNames(prototype)) {
      const method = prototype[key];
      if (
        typeof method !== 'function' ||
        Reflect.getMetadata(METHOD_METADATA, method) === undefined
      )
        continue;
      count += 1;
      const targets = [method, controller];
      expect(
        !!reflector.getAllAndOverride(HTTP_METADATA.PUBLIC, targets) ||
          !!reflector.getAllAndOverride(AUTHENTICATED_METADATA, targets) ||
          !!reflector.getAllAndOverride(PERMISSIONS_METADATA, targets),
      ).toBe(true);
    }
  }
  expect(count).toBeGreaterThan(20);
});
