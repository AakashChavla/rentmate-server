import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, map } from 'rxjs';
import { SKIP_ENVELOPE_KEY } from '../decorators/skip-envelope.decorator';
import type { SuccessResponse } from '../interfaces/api-response';
import { getRequestId } from '../../../shared/request-id';
import { PaginatedResult } from './paginated-result';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ENVELOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<Request>();
    if (skip || isRawPath(request.path || request.url)) {
      return next.handle();
    }

    const requestId = getRequestId(request);

    return next.handle().pipe(
      map((data: unknown) => {
        if (data instanceof StreamableFile) {
          return data;
        }

        if (data instanceof PaginatedResult) {
          const body: SuccessResponse<unknown> = {
            success: true,
            data: data.data,
            meta: {
              requestId,
              timestamp: new Date().toISOString(),
              page: data.page,
            },
          };
          return body;
        }

        const body: SuccessResponse<unknown> = {
          success: true,
          data: data ?? null,
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
        return body;
      }),
    );
  }
}

function isRawPath(path: string): boolean {
  const pathname = path.split('?')[0] ?? path;
  return (
    pathname === '/health/live' || pathname === '/health/ready' || pathname.startsWith('/health/')
  );
}
