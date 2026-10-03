import { getQueueToken } from '@nestjs/bullmq';
import { type INestApplication, RequestMethod, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Queue } from 'bullmq';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { ErrorCode } from '../../src/core/errors/error-codes';
import { createValidationPipe } from '../../src/core/http/pipes/validation.pipe';
import { CookieName } from '../../src/shared/auth-cookies';
import { seedDatabase } from '../../tools/seeds/run-seed';
import { validateEnv } from '../../src/core/config/env.schema';
import { PasswordService } from '../../src/modules/auth/services/password.service';
import { Role, RoleKey } from '../../src/modules/authorization/entities/role.entity';
import { ScopeType } from '../../src/modules/authorization/types/scope-type';
import { UserRoleAssignment } from '../../src/modules/authorization/entities/user-role-assignment.entity';
import {
  Organization,
  OrganizationPlan,
} from '../../src/modules/organizations/entities/organization.entity';
import { QueueName } from '../../src/core/queue/queue.constants';
import type { EmailJob } from '../../src/core/notifications/email-job.types';
import { User } from '../../src/modules/users/entities/user.entity';
import { UserStatus } from '../../src/modules/users/types/user-status';

import { EmailProvider } from '../../src/integrations/email/email.provider';
import { FakeEmailProvider } from '../../src/integrations/email/tests/fake-email.provider';

const PASSWORD = 'UserPass123';

describe('Auth and RBAC (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let fakeEmailProvider: FakeEmailProvider;
  let ownerA: { email: string; id: string };
  let maintenanceA: { email: string };
  let resetUser: { email: string };
  let userB: { id: string };

  beforeAll(async () => {
    fakeEmailProvider = new FakeEmailProvider();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailProvider)
      .useValue(fakeEmailProvider)
      .compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api', {
      exclude: [
        { path: 'health/live', method: RequestMethod.GET },
        { path: 'health/ready', method: RequestMethod.GET },
      ],
    });
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(createValidationPipe());
    await app.init();

    dataSource = app.get(DataSource);
    await dataSource.runMigrations();
    await seedDatabase(dataSource, validateEnv(process.env));

    const suffix = randomUUID().slice(0, 8);
    const orgA = await createOrganization(`org-a-${suffix}`);
    const orgB = await createOrganization(`org-b-${suffix}`);
    ownerA = await createMember(orgA, `owner-${suffix}@rentmate.test`, RoleKey.OrgOwner);
    resetUser = await createMember(orgA, `reset-${suffix}@rentmate.test`, RoleKey.Accountant);
    maintenanceA = await createMember(
      orgA,
      `maintenance-${suffix}@rentmate.test`,
      RoleKey.MaintenanceStaff,
    );
    userB = await createMember(orgB, `user-${suffix}@rentmate.test`, RoleKey.OrgOwner);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('logs in with three cookies and rejects a protected route without a session', async () => {
    const login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: ownerA.email,
      password: PASSWORD,
    });

    expect(login.status).toBe(200);
    expect(login.body.success).toBe(true);
    expect(login.body.data.user.email).toBe(ownerA.email);
    const cookies = setCookie(login);
    expect(cookies.some((cookie) => cookie.startsWith(`${CookieName.Access}=`))).toBe(true);
    expect(cookies.some((cookie) => cookie.startsWith(`${CookieName.Refresh}=`))).toBe(true);
    expect(cookies.some((cookie) => cookie.startsWith(`${CookieName.Session}=1`))).toBe(true);
    expect(JSON.stringify(login.body)).not.toContain(cookieValue(cookies, CookieName.Access));

    const denied = await request(app.getHttpServer()).get('/api/v1/users');
    expect(denied.status).toBe(401);
    expect(denied.body.error.code).toBe(ErrorCode.UNAUTHORIZED);
  });

  it('rotates refresh tokens and revokes the family when an old token is reused', async () => {
    const login = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: ownerA.email,
      password: PASSWORD,
    });
    const original = cookiePair(setCookie(login), CookieName.Refresh);
    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', original);
    expect(refreshed.status).toBe(200);
    const rotated = cookiePair(setCookie(refreshed), CookieName.Refresh);
    expect(rotated).not.toBe(original);

    const reused = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', original);
    expect(reused.status).toBe(401);
    expect(reused.body.error.code).toBe(ErrorCode.TOKEN_ROTATED);

    const validFollowUp = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', rotated);
    expect(validFollowUp.status).toBe(200);
    const rotated2 = cookiePair(setCookie(validFollowUp), CookieName.Refresh);

    const reuseOldAncestor = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', original);
    expect(reuseOldAncestor.status).toBe(401);
    expect(reuseOldAncestor.body.error.code).toBe(ErrorCode.SESSION_REVOKED);

    const followUpAfterRevocation = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', rotated2);
    expect(followUpAfterRevocation.status).toBe(401);
    expect(followUpAfterRevocation.body.error.code).toBe(ErrorCode.SESSION_REVOKED);
  });

  it('clears cookies on logout', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/v1/auth/login').send({ email: ownerA.email, password: PASSWORD });
    const logout = await agent.post('/api/v1/auth/logout');

    expect(logout.status).toBe(200);
    const cookies = setCookie(logout);
    for (const name of [CookieName.Access, CookieName.Refresh, CookieName.Session]) {
      const header = cookies.find((cookie) => cookie.startsWith(`${name}=`));
      expect(header?.toLowerCase()).toContain('max-age=0');
    }
  });

  it('logs in with an OTP and resets a password by revoking sessions', async () => {
    const sent = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/send')
      .send({ email: resetUser.email, purpose: 'LOGIN' });
    expect(sent.status).toBe(200);
    expect(sent.body.data).toEqual({ accepted: true });
    const unknown = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/send')
      .send({ email: 'missing@rentmate.test', purpose: 'LOGIN' });
    expect(unknown.body.data).toEqual({ accepted: true });

    const code = await latestOtp(resetUser.email, 'LOGIN');
    const verified = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ email: resetUser.email, purpose: 'LOGIN', code });
    expect(verified.status).toBe(200);
    expect(verified.body.data.user.email).toBe(resetUser.email);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: resetUser.email, password: PASSWORD });
    const refresh = cookiePair(setCookie(login), CookieName.Refresh);
    const forgot = await request(app.getHttpServer())
      .post('/api/v1/auth/password/forgot')
      .send({ email: 'missing@rentmate.test' });
    expect(forgot.body.data).toEqual({ accepted: true });
    await request(app.getHttpServer())
      .post('/api/v1/auth/password/forgot')
      .send({ email: resetUser.email });
    const resetCode = await latestOtp(resetUser.email, 'PASSWORD_RESET');
    const reset = await request(app.getHttpServer()).post('/api/v1/auth/password/reset').send({
      email: resetUser.email,
      code: resetCode,
      newPassword: 'ResetPass123',
    });
    expect(reset.status).toBe(200);

    const revoked = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refresh);
    expect(revoked.status).toBe(401);
  });

  it('returns 403 without user:read and 404 for a user in another organization', async () => {
    const maintenance = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: maintenanceA.email,
      password: PASSWORD,
    });
    const forbidden = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Cookie', cookiePair(setCookie(maintenance), CookieName.Access));
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe(ErrorCode.FORBIDDEN);

    const owner = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: ownerA.email,
      password: PASSWORD,
    });
    const crossOrg = await request(app.getHttpServer())
      .get(`/api/v1/users/${userB.id}`)
      .set('Cookie', cookiePair(setCookie(owner), CookieName.Access));
    expect(crossOrg.status).toBe(404);
    expect(crossOrg.body.error.code).toBe(ErrorCode.NOT_FOUND);
  });

  async function createOrganization(slug: string): Promise<string> {
    const saved = await dataSource.getRepository(Organization).save({
      name: slug,
      slug,
      plan: OrganizationPlan.Free,
      timezone: 'Asia/Kolkata',
      settings: {},
      isActive: true,
    });
    return saved.id;
  }

  async function createMember(
    organizationId: string,
    email: string,
    roleKey: RoleKey,
  ): Promise<{ id: string; email: string }> {
    const passwords = app.get(PasswordService);
    const role = await dataSource.getRepository(Role).findOneByOrFail({ key: roleKey });
    const saved = await dataSource.getRepository(User).save({
      organizationId,
      email,
      passwordHash: await passwords.hash(PASSWORD),
      fullName: email,
      phone: null,
      status: UserStatus.Active,
      emailVerifiedAt: new Date(),
      lastLoginAt: null,
      failedLoginCount: 0,
      lockedUntil: null,
      isPlatformAdmin: false,
      notificationPreferences: {},
    });
    await dataSource.getRepository(UserRoleAssignment).save({
      organizationId,
      userId: saved.id,
      roleId: role.id,
      scopeType: ScopeType.Organization,
      scopeId: organizationId,
      assignedBy: null,
      expiresAt: null,
    });
    return { id: saved.id, email };
  }

  async function latestOtp(email: string, purpose: string): Promise<string> {
    const queue = app.get<Queue<EmailJob>>(getQueueToken(QueueName.NotificationEmail));
    const queued = await queue.getJobs(['waiting', 'delayed', 'completed', 'active']);
    const match = queued.reverse().find((job) => {
      const payload = job.data as unknown as { purpose?: string; data?: { purpose?: string } };
      return (
        job.data.to === email && (payload.data?.purpose === purpose || payload.purpose === purpose)
      );
    });
    const payload = match?.data as unknown as
      { code?: string; data?: { code?: string } } | undefined;
    const code = payload?.data?.code ?? payload?.code;
    if (!code) {
      throw new Error(`OTP job for ${email} was not queued`);
    }

    return code;
  }
});

function setCookie(response: request.Response): string[] {
  const value = response.headers['set-cookie'];
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function cookiePair(cookies: string[], name: string): string {
  const header = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!header) {
    throw new Error(`Missing ${name} cookie`);
  }

  return header.split(';')[0] ?? header;
}

function cookieValue(cookies: string[], name: string): string {
  return cookiePair(cookies, name).slice(name.length + 1);
}
