import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, type Observable } from 'rxjs';
import { Clock } from '../time/clock.contract';
import { RequestContext } from '../context/request-context';
import { HTTP_METADATA } from './http.decorators';
export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta: { requestId: string; timestamp: string; page?: unknown };
}
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  public constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(RequestContext) private readonly context: RequestContext,
  ) {}
  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (
      this.reflector.getAllAndOverride<boolean>(HTTP_METADATA.SKIP_ENVELOPE, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return next.handle();
    return next.handle().pipe(
      map((data: unknown) => {
        const paginated = isPage(data);
        return {
          success: true,
          data: paginated ? data.items : data,
          meta: {
            requestId: this.context.current()?.requestId ?? '',
            timestamp: this.clock.now().toISOString(),
            ...(paginated ? { page: data.page } : {}),
          },
        };
      }),
    );
  }
}
function isPage(data: unknown): data is { items: unknown[]; page: unknown } {
  return (
    !!data &&
    typeof data === 'object' &&
    'items' in data &&
    Array.isArray(data.items) &&
    'page' in data
  );
}
