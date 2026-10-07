import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { configureApplication } from '../../bootstrap';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import { connectInfrastructure } from '../../core/lifecycle/infrastructure';
import { EmailProvider } from '../../integrations/email/email-provider.contract';
import { FakeAuthEmail } from '../fakes/fake-auth-email';
import { CONSENT, ROLE, USER_STATUS } from '../../shared/identity.constants';
import type { PermissionContext } from '../../shared/identity.types';
import { UserRepository } from '../../modules/users';
import { UsersService } from '../../modules/users';
import { KeyValueStore } from '../../core/redis/key-value-store.contract';
import { PasswordHasher as PASSWORD_HASHER_TOKEN } from '../../integrations/password/password-hasher.contract';

export const ORIGIN = 'http://localhost:3001';
export const FIXTURE_PASSWORD = 'FixturePassword123';
export interface FixtureAccount {
  me: PermissionContext;
  cookies: string[];
  email: string;
}
export class IdentityFixture {
  public app!: INestApplication;
  public readonly mail = new FakeAuthEmail();
  protected readonly orgs = new Set<string>();
  public async start(): Promise<void> {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailProvider)
      .useValue(this.mail)
      .compile();
    this.app = module.createNestApplication();
    configureApplication(this.app);
    await connectInfrastructure(this.app);
    await this.app.init();
  }
  public http(): ReturnType<typeof request> {
    return request(this.app.getHttpServer() as Server);
  }
  public async resetThrottle(): Promise<void> {
    const store = this.app.get(KeyValueStore);
    const endpoints = [
      'register',
      'register/verify',
      'register/resend',
      'login',
      'refresh',
      'logout',
      'otp/send',
      'otp/verify',
      'password/forgot',
      'password/reset',
      'password/change',
      'me',
    ];
    const window = Math.floor(Date.now() / 60000);
    await Promise.all(
      endpoints.flatMap((endpoint) =>
        ['::ffff:127.0.0.1', '127.0.0.1', '::1'].map((ip) =>
          store.delete(`auth:throttle:/api/v1/auth/${endpoint}:${ip}:${String(window)}`),
        ),
      ),
    );
  }
  public async account(locale = 'en'): Promise<FixtureAccount> {
    const email = `identity-${randomUUID()}@fixture.rentmate.test`;
    await this.http()
      .post('/api/v1/auth/register')
      .set('Origin', ORIGIN)
      .send({
        fullName: 'Fixture owner',
        email,
        password: FIXTURE_PASSWORD,
        organizationName: 'Fixture organization',
        locale,
        acceptTerms: true,
        termsVersion: CONSENT.VERSION,
      })
      .expect(202);
    const response = await this.http()
      .post('/api/v1/auth/register/verify')
      .set('Origin', ORIGIN)
      .send({ email, code: this.mail.code(email) })
      .expect(200);
    const body = response.body as { data: PermissionContext };
    this.orgs.add(body.data.organization.id);
    return {
      me: body.data,
      cookies: (response.headers['set-cookie'] as unknown as string[]).map(
        (value) => value.split(';')[0] ?? '',
      ),
      email,
    };
  }
  public async member(owner: FixtureAccount, role: string = ROLE.TENANT): Promise<FixtureAccount> {
    const org = owner.me.organization.id;
    const email = `member-${randomUUID()}@fixture.rentmate.test`;
    const hasher =
      this.app.get<import('../../integrations/password/password-hasher.contract').PasswordHasher>(
        PASSWORD_HASHER_TOKEN,
      );
    const user = await this.app.get(UserRepository).createInOrg(
      org,
      {
        email,
        fullName: 'Fixture member',
        phone: null,
        locale: 'en',
        status: USER_STATUS.ACTIVE,
        isPlatformAdmin: false,
      },
      await hasher.hash(FIXTURE_PASSWORD),
    );
    await this.app.get(UserRepository).verifyEmail(org, user.id, new Date());
    await this.app.get(UsersService).assign(org, owner.me.user.id, user.id, role, 'ORGANIZATION');
    const response = await this.http()
      .post('/api/v1/auth/login')
      .set('Origin', ORIGIN)
      .send({ email, password: FIXTURE_PASSWORD })
      .expect(200);
    return {
      email,
      me: (response.body as { data: PermissionContext }).data,
      cookies: (response.headers['set-cookie'] as unknown as string[]).map(
        (value) => value.split(';')[0] ?? '',
      ),
    };
  }
  public async close(): Promise<void> {
    const db = this.app.get(DatabaseConnection);
    for (const org of this.orgs)
      await db.withManager((m) => m.query('DELETE FROM organizations WHERE id=$1', [org]));
    await this.app.close();
  }
}
