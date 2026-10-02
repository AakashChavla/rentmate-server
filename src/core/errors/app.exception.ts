import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from './error-codes';

export class AppException extends HttpException {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string, status: HttpStatus, details: unknown = null) {
    super({ code, message, details }, status);
    this.code = code;
  }

  static getErrorCode(error: unknown): ErrorCode | undefined {
    if (error instanceof AppException) {
      return error.code;
    }
    if (
      typeof error === 'object' &&
      error !== null &&
      'getResponse' in error &&
      typeof (error as { getResponse: () => unknown }).getResponse === 'function'
    ) {
      const resp = (error as { getResponse: () => unknown }).getResponse();
      if (typeof resp === 'object' && resp !== null && 'code' in resp) {
        return (resp as { code: ErrorCode }).code;
      }
    }
    return undefined;
  }
}
