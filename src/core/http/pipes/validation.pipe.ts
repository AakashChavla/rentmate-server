import { BadRequestException, ValidationPipe, type ValidationError } from '@nestjs/common';
import { ErrorCode } from '../../errors/error-codes';

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
    exceptionFactory: (errors: ValidationError[]) => {
      const details = flattenValidationErrors(errors);
      const weakPassword = isWeakPasswordFailure(details);
      return new BadRequestException({
        code: weakPassword ? ErrorCode.WEAK_PASSWORD : ErrorCode.VALIDATION_ERROR,
        message: weakPassword ? 'Password does not meet the policy' : 'Validation failed',
        details,
      });
    },
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

const PASSWORD_POLICY_FIELDS = new Set(['password', 'newPassword']);

function isWeakPasswordFailure(details: FieldError[]): boolean {
  return details.length > 0 && details.every((error) => PASSWORD_POLICY_FIELDS.has(error.field));
}
