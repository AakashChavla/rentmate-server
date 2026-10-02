import { Controller, Get } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { SkipEnvelope } from '../decorators/skip-envelope.decorator';
import { ResponseEnvelopeInterceptor } from '../interceptors/response-envelope.interceptor';
import { PaginatedResult } from '../interceptors/paginated-result';

@Controller()
class ProbeController {
  @Get()
  plain(): void {}

  @SkipEnvelope()
  @Get()
  raw(): void {}
}

describe('ResponseEnvelopeInterceptor', () => {
  const interceptor = new ResponseEnvelopeInterceptor(new Reflector());

  function contextFor(method: 'plain' | 'raw', path = '/api/v1/items'): ExecutionContext {
    return {
      getType: () => 'http',
      getHandler: () => ProbeController.prototype[method],
      getClass: () => ProbeController,
      switchToHttp: () => ({
        getRequest: () => ({ id: 'req-123', path, url: path }),
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as unknown as ExecutionContext;
  }

  it('wraps handler data in the success envelope', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(contextFor('plain'), {
        handle: () => of({ id: 'item-1' }),
      }),
    );

    expect(result).toEqual({
      success: true,
      data: { id: 'item-1' },
      meta: {
        requestId: 'req-123',
        timestamp: expect.any(String),
      },
    });
  });

  it('lifts page metadata out of a paginated result', async () => {
    const page = { limit: 20, hasNext: false, nextCursor: null };
    const result = await lastValueFrom(
      interceptor.intercept(contextFor('plain'), {
        handle: () => of(new PaginatedResult([{ id: 'item-1' }], page)),
      }),
    );

    expect(result).toEqual({
      success: true,
      data: [{ id: 'item-1' }],
      meta: {
        requestId: 'req-123',
        timestamp: expect.any(String),
        page,
      },
    });
  });

  it('leaves skipped and health responses unwrapped', async () => {
    const raw = await lastValueFrom(
      interceptor.intercept(contextFor('raw'), {
        handle: () => of({ status: 'ok' }),
      }),
    );
    const health = await lastValueFrom(
      interceptor.intercept(contextFor('plain', '/health/live'), {
        handle: () => of({ status: 'ok' }),
      }),
    );

    expect(raw).toEqual({ status: 'ok' });
    expect(health).toEqual({ status: 'ok' });
  });
});
