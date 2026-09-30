import { BadRequestException, ValidationPipe, type ValidationError } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';

export interface FieldError {
  field: string;
  messages: string[];
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    exceptionFactory: (errors: ValidationError[]) =>
      new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details: flattenValidationErrors(errors),
      }),
  });
}

export function flattenValidationErrors(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const messages = error.constraints ? Object.values(error.constraints) : [];
    const current = messages.length > 0 ? [{ field, messages }] : [];
    const children = error.children?.length ? flattenValidationErrors(error.children, field) : [];
    return [...current, ...children];
  });
}
