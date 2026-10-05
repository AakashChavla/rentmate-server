import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Equals,
} from 'class-validator';
import { IDENTITY_LIMITS as L, CONSENT, PASSWORD_POLICY } from '../../../shared/identity.constants';
import { SUPPORTED_LOCALES, type Locale } from '../../../shared/locale.constants';
const EMAIL_MAX = 320;
export class EmailDto {
  @ApiProperty({ type: String })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(EMAIL_MAX)
  email!: string;
}
export class LoginDto extends EmailDto {
  @ApiProperty({ type: String, minLength: L.PASSWORD_MIN, maxLength: L.PASSWORD_MAX })
  @IsString()
  @Length(1, L.PASSWORD_MAX)
  password!: string;
}
export class OtpDto extends EmailDto {
  @ApiProperty({ type: String, minLength: L.OTP_DIGITS, maxLength: L.OTP_DIGITS })
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
export class RegisterDto extends LoginDto {
  @ApiProperty({ type: String }) @IsString() @Length(1, L.NAME_MAX) fullName!: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(L.PHONE_MAX)
  phone?: string;
  @ApiProperty({ type: String }) @IsString() @Length(1, L.NAME_MAX) organizationName!: string;
  @ApiProperty({ type: String, enum: SUPPORTED_LOCALES }) @IsIn(SUPPORTED_LOCALES) locale!: Locale;
  @ApiProperty({ type: Boolean }) @IsBoolean() @Equals(true) acceptTerms!: boolean;
  @ApiProperty({ type: String, enum: [CONSENT.VERSION] })
  @Equals(CONSENT.VERSION)
  termsVersion!: string;
}
export class ResetPasswordDto extends OtpDto {
  @ApiProperty({ type: String, minLength: L.PASSWORD_MIN, maxLength: L.PASSWORD_MAX })
  @Matches(PASSWORD_POLICY)
  password!: string;
}
export class ChangePasswordDto {
  @ApiProperty({ type: String }) @IsString() @Length(1, L.PASSWORD_MAX) currentPassword!: string;
  @ApiProperty({ type: String, minLength: L.PASSWORD_MIN, maxLength: L.PASSWORD_MAX })
  @Matches(PASSWORD_POLICY)
  password!: string;
}
export class NeutralDto {
  @ApiProperty({ type: Boolean, enum: [true] }) accepted!: boolean;
}
