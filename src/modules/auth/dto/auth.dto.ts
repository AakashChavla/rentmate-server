import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Equals, IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword } from '../../../common/decorators/password-policy.decorator';
import { OtpPurpose } from '../otp-verification.entity';
import { UserStatus } from '../../users/user.entity';

function normalizeEmail(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class LoginDto {
  @ApiProperty({ example: 'demo@rentmate.local' })
  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

export class OtpSendDto {
  @ApiProperty()
  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: [OtpPurpose.Login] })
  @Equals(OtpPurpose.Login)
  purpose!: OtpPurpose;
}

export class OtpVerifyDto extends OtpSendDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code!: string;
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

export class MeUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty()
  organizationId!: string;
}

export class MeOrganizationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  plan!: string;
}

export class MeRoleDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  scopeType!: string;

  @ApiProperty()
  scopeId!: string;
}

export class MeResponseDto {
  @ApiProperty({ type: MeUserDto })
  user!: MeUserDto;

  @ApiProperty({ type: MeOrganizationDto })
  organization!: MeOrganizationDto;

  @ApiProperty({ type: [MeRoleDto] })
  roles!: MeRoleDto[];

  @ApiProperty({ type: [String] })
  permissions!: string[];

  @ApiProperty()
  isPlatformAdmin!: boolean;
}

export class AcceptedDto {
  @ApiProperty({ example: true })
  accepted!: boolean;
}

export class LogoutDto {
  @ApiProperty({ example: true })
  loggedOut!: boolean;
}

export class PasswordChangedDto {
  @ApiPropertyOptional({ example: true })
  changed?: boolean;

  @ApiPropertyOptional({ example: true })
  reset?: boolean;
}
