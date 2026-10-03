import 'reflect-metadata';
import { Controller, Get, Post, Body, Inject, type INestApplication } from '@nestjs/common';
import { IsString } from 'class-validator';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { configureApplication } from '../../bootstrap';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import { KeyValueStore } from '../../core/redis/key-value-store.contract';
import { FakeDatabase } from '../fakes/fake-database';
import { FakeKeyValueStore } from '../fakes/fake-key-value-store';
import { AppConfig } from '../../core/config/app-config.contract';
import { AppConfigService } from '../../core/config/default-app-config.service';
import type { AppEnvironment } from '../../core/config/env.schema';
import { RequestContext } from '../../core/context/request-context';
import { Req } from '@nestjs/common';
import type { Request } from 'express';
class Payload {
  @IsString() public name!: string;
}
@Controller('probe')
class ProbeController {
  public constructor(@Inject(RequestContext) private readonly context: RequestContext) {}
  @Get() public read(@Req() req: Request): unknown {
    return { requestId: this.context.current()?.requestId, ip: req.ip };
  }
  @Post() public write(@Body() body: Payload): Payload {
    return body;
  }
  @Get('failure') public fail(): never {
    throw new Error('private db credentials');
  }
}
async function testApp(swagger: boolean, proxy: number): Promise<INestApplication> {
  const base = new AppConfigService();
  class Config extends AppConfig {
    public override get<K extends keyof AppEnvironment>(key: K): AppEnvironment[K] {
      const values: Record<string, unknown> = { SWAGGER_ENABLED: swagger, TRUST_PROXY: proxy };
      return (key in values ? values[key] : base.get(key)) as AppEnvironment[K];
    }
  }
  const module = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [ProbeController],
  })
    .overrideProvider(DatabaseConnection)
    .useValue(new FakeDatabase())
    .overrideProvider(KeyValueStore)
    .useValue(new FakeKeyValueStore())
    .overrideProvider(AppConfig)
    .useValue(new Config())
    .compile();
  const app = module.createNestApplication();
  configureApplication(app);
  await app.init();
  return app;
}
type AppGetter = () => INestApplication;
function registerHealth(get: AppGetter): void {
  it('returns unwrapped health and readiness; propagates request-id', async () => {
    const response = await request(get().getHttpServer() as Parameters<typeof request>[0])
      .get('/health/ready')
      .set('X-Request-ID', 'client-id')
      .expect(200);
    expect(response.body).toEqual({ status: 'ok', postgres: true, redis: true });
    expect(response.headers['x-request-id']).toBe('client-id');
    const wrapped = await request(get().getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/probe')
      .set('X-Request-ID', 'same-id')
      .set('X-Forwarded-For', '192.0.2.1')
      .expect(200);
    expect(wrapped.body).toMatchObject({
      success: true,
      data: { requestId: 'same-id', ip: '192.0.2.1' },
      meta: { requestId: 'same-id' },
    });
  });
  it('blocks cookie-auth unsafe requests with wrong Origin', async () => {
    const response = await request(get().getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/probe')
      .set('Cookie', 'rm_access=fixture')
      .set('Origin', 'https://evil.example')
      .send({ name: 'test' })
      .expect(403);
    expect(response.body).toMatchObject({ error: { code: 'CSRF_ORIGIN_MISMATCH' } });
  });
}
function registerErrors(get: AppGetter): void {
  it.each(['en', 'hi'])('localizes errors and never leaks 5xx for %s', async (locale) => {
    const response = await request(get().getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/probe/failure')
      .set('Accept-Language', locale)
      .expect(500);
    expect(response.body).toMatchObject({ success: false, error: { code: 'INTERNAL_ERROR' } });
    expect(JSON.stringify(response.body)).not.toContain('credentials');
    const body = response.body as { error: { message: string } };
    expect(body.error.message).toBe(
      locale === 'hi' ? 'कुछ गलत हुआ। फिर कोशिश करें।' : 'Something went wrong. Please try again.',
    );
  });
  it('validates fields and rejects unknown input', async () => {
    const response = await request(get().getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/probe')
      .set('Accept-Language', 'hi')
      .send({ name: 1, extra: true })
      .expect(400);
    const body = response.body as { error: { details: unknown } };
    expect(body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'name',
          code: 'VALIDATION_ERROR',
          message: 'यह फ़ील्ड अमान्य है।',
        }),
      ]),
    );
  });
}
describe('platform HTTP boundaries', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await testApp(true, 1);
  });
  afterAll(async () => {
    await app.close();
  });
  registerHealth(() => app);
  registerErrors(() => app);
  it('exposes cookie-auth Swagger only when enabled', async () => {
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/docs-json')
      .expect(200);
    const disabled = await testApp(false, 0);
    try {
      await request(disabled.getHttpServer() as Parameters<typeof request>[0])
        .get('/api/docs-json')
        .expect(404);
    } finally {
      await disabled.close();
    }
  });
});
