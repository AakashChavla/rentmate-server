import type { Request, Response, NextFunction } from 'express';
import { atomicThrottle, requestIdentity, originCheck } from './platform-middleware';
import { FakeClock } from '../time/tests/fake-clock';
import { FakeKeyValueStore } from '../../test/fakes/fake-key-value-store';
import { AppConfigService } from '../config/default-app-config.service';
import { FakeIdGenerator } from '../../test/fakes/fake-id-generator';
import { RequestContext } from '../context/request-context';
describe('HTTP middleware safety', () => {
  it('replaces invalid request ids and preserves ALS throughout next', () => {
    const context = new RequestContext();
    const ids = new FakeIdGenerator();
    const request = { get: () => 'invalid request id' } as unknown as Request;
    const setHeader = jest.fn();
    const response = { setHeader } as unknown as Response;
    requestIdentity(context, ids)(request, response, () => {
      expect(context.current()?.requestId).toBe(ids.next());
    });
    expect(request.id).toBe(ids.next());
  });
  it('atomically limits a fixed window and emits retry-after', async () => {
    const store = new FakeKeyValueStore();
    const config = new AppConfigService();
    const middleware = atomicThrottle(
      config,
      store,
      new FakeClock(new Date('2026-10-03T00:00:00Z')),
    );
    const request = { ip: '192.0.2.2' } as unknown as Request;
    const setHeader = jest.fn();
    const response = { setHeader } as unknown as Response;
    const outcomes: unknown[] = [];
    for (let i = 0; i <= config.get('THROTTLE_LIMIT'); i += 1) {
      await new Promise<void>((resolve) => {
        middleware(request, response, ((error?: unknown) => {
          outcomes.push(error);
          resolve();
        }) as NextFunction);
      });
    }
    expect(outcomes.at(-1)).toMatchObject({ code: 'RATE_LIMITED' });
    expect(setHeader).toHaveBeenCalledWith('Retry-After', 60);
  });
  it('requires Origin only for unsafe cookie-authenticated calls', () => {
    const middleware = originCheck(new AppConfigService());
    const next = jest.fn();
    middleware(
      {
        method: 'GET',
        cookies: { rm_access: 'fixture' },
        get: () => undefined,
      } as unknown as Request,
      {} as Response,
      next,
    );
    expect(next).toHaveBeenCalledWith();
  });
});
