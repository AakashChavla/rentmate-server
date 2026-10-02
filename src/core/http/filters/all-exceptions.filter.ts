import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ErrorCode } from '../../errors/error-codes';
import type { ErrorResponse } from '../interfaces/api-response';
import { getRequestId } from '../../../shared/request-id';

interface ExceptionBody {
  code?: unknown;
  message?: unknown;
  details?: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const requestId = getRequestId(request);
    const mapped = this.mapException(exception);

    if (mapped.status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(
        { requestId, err: exception, path: request.url, method: request.method },
        mapped.message,
      );
    } else {
      this.logger.warn(
        { requestId, path: request.url, method: request.method, code: mapped.code },
        mapped.message,
      );
    }

    const body: ErrorResponse = {
      success: false,
      error: {
        code: mapped.code,
        message: mapped.message,
        details: mapped.details,
      },
      meta: { requestId },
    };

    response.status(mapped.status).json(body);
  }

  private mapException(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details: unknown;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const responseBody = exception.getResponse();
      const body = isRecord(responseBody) ? (responseBody as ExceptionBody) : undefined;

      if (typeof body?.code === 'string') {
        return {
          status,
          code: body.code,
          message: typeof body.message === 'string' ? body.message : exception.message,
          details: body.details ?? null,
        };
      }

      if (Array.isArray(body?.message)) {
        return {
          status,
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          details: body.message,
        };
      }

      const message =
        typeof responseBody === 'string'
          ? responseBody
          : typeof body?.message === 'string'
            ? body.message
            : exception.message;

      return {
        status,
        code: statusToErrorCode(status),
        message,
        details: null,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
      details: null,
    };
  }
}

function statusToErrorCode(status: number): ErrorCode {
  switch (status) {
    case Number(HttpStatus.BAD_REQUEST):
      return ErrorCode.BAD_REQUEST;
    case Number(HttpStatus.UNAUTHORIZED):
      return ErrorCode.UNAUTHORIZED;
    case Number(HttpStatus.FORBIDDEN):
      return ErrorCode.FORBIDDEN;
    case Number(HttpStatus.NOT_FOUND):
      return ErrorCode.NOT_FOUND;
    case Number(HttpStatus.CONFLICT):
      return ErrorCode.CONFLICT;
    case Number(HttpStatus.TOO_MANY_REQUESTS):
      return ErrorCode.RATE_LIMITED;
    default:
      return status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)
        ? ErrorCode.INTERNAL_ERROR
        : ErrorCode.BAD_REQUEST;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
