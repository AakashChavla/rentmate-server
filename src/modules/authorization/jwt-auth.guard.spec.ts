import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AnyAuthenticated, RequirePermissions } from './permission.decorators';
import { DefaultPermissionService } from './default-permission.service';
import { Public } from '../../core/http/http.decorators';
import { RequestContext } from '../../core/context/request-context';
import { UnitIdentityFixture } from '../../test/fakes/identity-fixture';
import { CONSENT } from '../../shared/identity.constants';
class Routes {
  public missing(): void {}
  @Public() public open(): void {}
  @AnyAuthenticated() public profile(): void {}
  @RequirePermissions('platform:delete') public platform(): void {}
}
function execution(handler: () => void, request: object = {}): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => Routes,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}
it('allows public handlers without session work, denies missing annotations and missing cookies', async () => {
  const f = new UnitIdentityFixture();
  const guard = new JwtAuthGuard(
    new Reflector(),
    f.sessions,
    f.contexts,
    new DefaultPermissionService(),
    new RequestContext(),
  );
  expect(await guard.canActivate(execution(handler('open')))).toBe(true);
  await expect(guard.canActivate(execution(handler('missing')))).rejects.toMatchObject({
    code: 'FORBIDDEN',
  });
  await expect(guard.canActivate(execution(handler('profile')))).rejects.toMatchObject({
    code: 'UNAUTHORIZED',
  });
});
it('sets verified request identity and rejects missing permissions or revoked sessions', async () => {
  const f = new UnitIdentityFixture();
  const email = 'guard@fixture.rentmate.test';
  const metadata = { ip: '127.0.0.1', userAgent: 'fixture' };
  const session = await signedSession(f, email, metadata);
  const requests = new RequestContext();
  const guard = new JwtAuthGuard(
    new Reflector(),
    f.sessions,
    f.contexts,
    new DefaultPermissionService(),
    requests,
  );
  const request = { cookies: { rm_access: session.tokens.access } };
  await requests.run({ requestId: 'fixture' }, async () => {
    expect(await guard.canActivate(execution(handler('profile'), request))).toBe(true);
    expect(requests.current()).toMatchObject({
      organizationId: session.me.organization.id,
      userId: session.me.user.id,
    });
  });
  await expect(guard.canActivate(execution(handler('platform'), request))).rejects.toMatchObject({
    code: 'FORBIDDEN',
  });
  await f.sessions.revokeUser(session.me.organization.id, session.me.user.id);
  await expect(guard.canActivate(execution(handler('profile'), request))).rejects.toMatchObject({
    code: 'SESSION_REVOKED',
  });
});

function handler(name: keyof Routes): () => void {
  return Reflect.get(Routes.prototype, name);
}

async function signedSession(
  f: UnitIdentityFixture,
  email: string,
  metadata: { ip: string; userAgent: string },
): ReturnType<UnitIdentityFixture['auth']['verifyRegistration']> {
  await f.auth.register(
    {
      email,
      password: 'FixturePassword123',
      fullName: 'Fixture',
      organizationName: 'Fixture',
      locale: 'en',
      acceptTerms: true,
      termsVersion: CONSENT.VERSION,
    },
    metadata,
  );
  return await f.auth.verifyRegistration(email, '123456', metadata);
}
