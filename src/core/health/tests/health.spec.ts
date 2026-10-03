import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../app.module';
import { Clock } from '../../time/clock.contract';
import { FakeClock } from '../../time/tests/fake-clock';
describe('public liveness', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(Clock)
      .useValue(new FakeClock(new Date('2026-10-03T00:00:00Z')))
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it.each([
    ['en', 'RentMate is running.'],
    ['hi', 'RentMate चल रहा है।'],
  ])('localizes the real endpoint for %s', async (locale, message) => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/health/live')
      .set('Accept-Language', locale)
      .expect(200);
    expect(response.body).toEqual({
      status: 'ok',
      message,
      timestamp: '2026-10-03T00:00:00.000Z',
      locale,
    });
  });
  it('prefers the locale cookie over Accept-Language', async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/health/live')
      .set('Cookie', 'NEXT_LOCALE=hi')
      .set('Accept-Language', 'en')
      .expect(200);
    expect(response.body).toMatchObject({ locale: 'hi' });
  });
});
