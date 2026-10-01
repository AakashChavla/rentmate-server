import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword } from '../../../common/decorators/password-policy.decorator';

function normalizeEmail(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class PasswordForgotDto {
  @ApiProperty()
  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail()
  email!: string;
}

export class PasswordResetDto {
  @ApiProperty()
  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code!: string;

  @ApiProperty()
  @IsString()
  @IsStrongPassword()
  newPassword!: string;
}

export class PasswordChangeDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty()
  @IsString()
  @IsStrongPassword()
  newPassword!: string;
}

export class PasswordChangedDto {
  @ApiPropertyOptional({ example: true })
  changed?: boolean;

  @ApiPropertyOptional({ example: true })
  reset?: boolean;
}
