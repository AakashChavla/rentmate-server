import { applyDecorators } from '@nestjs/common';
import { Matches, MaxLength, MinLength } from 'class-validator';

/** 10–128 characters, with at least one letter and one number. */
export function IsStrongPassword(): PropertyDecorator {
  return applyDecorators(
    MinLength(10, { message: 'must be at least 10 characters' }),
    MaxLength(128, { message: 'must be at most 128 characters' }),
    Matches(/[A-Za-z]/, { message: 'must contain a letter' }),
    Matches(/\d/, { message: 'must contain a number' }),
  );
}
