import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { getRequestId } from '../../../shared/request-id';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const pathname = (request.path || request.url).split('?')[0] ?? request.url;
    if (pathname.startsWith('/health')) {
      return next.handle();
    }

    const startedAt = Date.now();
    const requestId = getRequestId(request);

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log({
            msg: 'request completed',
            requestId,
            method: request.method,
            url: request.url,
            statusCode: response.statusCode,
            durationMs: Date.now() - startedAt,
          });
        },
        error: () => {
          this.logger.warn({
            msg: 'request failed',
            requestId,
            method: request.method,
            url: request.url,
            durationMs: Date.now() - startedAt,
          });
        },
      }),
    );
  }
}
