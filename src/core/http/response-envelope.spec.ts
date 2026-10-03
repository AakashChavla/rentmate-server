import { of, firstValueFrom } from 'rxjs';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor';
import { RequestContext } from '../context/request-context';
import { FakeClock } from '../time/tests/fake-clock';
describe('response envelope', () => {
  it('unwraps cursor pages and includes contextual metadata', async () => {
    const context = new RequestContext();
    const interceptor = new ResponseEnvelopeInterceptor(
      new Reflector(),
      new FakeClock(new Date('2026-10-03T00:00:00Z')),
      context,
    );
    const execution = {
      getHandler: () => function handler(): void {},
      getClass: () => class Controller {},
    } as unknown as ExecutionContext;
    const result = await context.run({ requestId: 'test-request' }, () =>
      firstValueFrom(
        interceptor.intercept(execution, {
          handle: () => of({ items: [1], page: { limit: 1, hasNext: false, nextCursor: null } }),
        }),
      ),
    );
    expect(result).toEqual({
      success: true,
      data: [1],
      meta: {
        requestId: 'test-request',
        timestamp: '2026-10-03T00:00:00.000Z',
        page: { limit: 1, hasNext: false, nextCursor: null },
      },
    });
  });
});
