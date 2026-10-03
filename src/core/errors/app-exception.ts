import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-code.constants';
const STATUS_BY_CODE: Partial<Record<ErrorCode, number>> = {
  [ErrorCode.VALIDATION_ERROR]: HttpStatus.BAD_REQUEST,
  [ErrorCode.INVALID_CURSOR]: HttpStatus.BAD_REQUEST,
  [ErrorCode.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
  [ErrorCode.FORBIDDEN]: HttpStatus.FORBIDDEN,
  [ErrorCode.CSRF_ORIGIN_MISMATCH]: HttpStatus.FORBIDDEN,
  [ErrorCode.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.CONFLICT]: HttpStatus.CONFLICT,
  [ErrorCode.RATE_LIMITED]: HttpStatus.TOO_MANY_REQUESTS,
  [ErrorCode.INFRASTRUCTURE_UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
};
export class AppException extends HttpException {
  public constructor(
    public readonly code: ErrorCode,
    public readonly details?: unknown,
  ) {
    super({ code }, STATUS_BY_CODE[code] ?? HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
