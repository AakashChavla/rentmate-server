import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Equals, IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { OtpPurpose } from '../entities/otp-verification.entity';

function normalizeEmail(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
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
