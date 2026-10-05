import { Body, Query, ValidationPipe, type Type } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { AppException } from '../errors/app-exception';
import { ErrorCode } from '../errors/error-code.constants';
import { validationFields } from './validation';
function pipe(model: Type<object>): ValidationPipe {
  return new ValidationPipe({
    expectedType: model,
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (errors) =>
      new AppException(ErrorCode.VALIDATION_ERROR, validationFields(errors)),
  });
}
export function ValidatedBody(model: Type<object>): ParameterDecorator {
  return (target, key, index) => {
    if (key !== undefined) {
      const descriptor = Object.getOwnPropertyDescriptor(target, key);
      if (descriptor) ApiBody({ type: model })(target, key, descriptor);
    }
    Body(pipe(model))(target, key, index);
  };
}
export function ValidatedQuery(model: Type<object>): ParameterDecorator {
  return Query(pipe(model));
}
