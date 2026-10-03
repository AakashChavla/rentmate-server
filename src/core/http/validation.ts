import { ValidationPipe, type ValidationError } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import { AppException } from '../errors/app-exception';
import { ErrorCode } from '../errors/error-code.constants';
import { messageKey } from '../../shared/message-key';
import { DEFAULT_LOCALE } from '../../shared/locale.constants';
export interface FieldError {
  field: string;
  code: ErrorCode;
  message: string;
}
export function validationFields(errors: ValidationError[], prefix = ''): FieldError[] {
  const context = I18nContext.current();
  return errors.flatMap((error) => {
    const field = prefix ? `${prefix}.${error.property}` : error.property;
    const message =
      context?.t(messageKey('validation.invalid'), { lang: context.lang }) ?? DEFAULT_LOCALE;
    return [
      ...(error.constraints ? [{ field, code: ErrorCode.VALIDATION_ERROR, message }] : []),
      ...validationFields(error.children ?? [], field),
    ];
  });
}
export function applicationValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (errors) =>
      new AppException(ErrorCode.VALIDATION_ERROR, validationFields(errors)),
  });
}
