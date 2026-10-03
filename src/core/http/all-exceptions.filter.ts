import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Inject,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { I18nService } from 'nestjs-i18n';
import { AppException } from '../errors/app-exception';
import { ErrorCode } from '../errors/error-code.constants';
import { ERROR_KEYS } from '../errors/error-keys.constants';
import { RequestContext } from '../context/request-context';
import { resolveLocale } from '../../shared/locale';
import { COOKIE_NAMES, HEADER_NAMES, LOG_STATUS } from '../config/config.constants';
import { CursorError } from '../../shared/cursor';
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  public constructor(
    @Inject(I18nService) private readonly i18n: I18nService,
    @Inject(RequestContext) private readonly context: RequestContext,
  ) {}
  public catch(error: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<Request>();
    const response = host.switchToHttp().getResponse<Response>();
    const normalized =
      error instanceof CursorError ? new AppException(ErrorCode.INVALID_CURSOR) : error;
    const status =
      normalized instanceof HttpException
        ? normalized.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const code = normalized instanceof AppException ? normalized.code : codeForStatus(status);
    const cookies = request.cookies as Record<string, string> | undefined;
    const lang = resolveLocale({
      cookie: cookies?.[COOKIE_NAMES.LOCALE],
      acceptLanguage: request.get(HEADER_NAMES.ACCEPT_LANGUAGE),
    });
    const message = this.i18n.translate(ERROR_KEYS[code], { lang });
    response.status(status).json({
      success: false,
      error: { code, message, ...safeDetails(normalized, status) },
      meta: { requestId: this.context.current()?.requestId ?? '' },
    });
  }
}
function safeDetails(error: unknown, status: number): Record<string, unknown> {
  return status < LOG_STATUS.SERVER_ERROR &&
    error instanceof AppException &&
    error.details !== undefined
    ? { details: error.details }
    : {};
}
function codeForStatus(status: number): ErrorCode {
  const codes: Record<number, ErrorCode> = {
    [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_ERROR,
    [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
    [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
    [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
    [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMITED,
  };
  return codes[status] ?? ErrorCode.INTERNAL_ERROR;
}
