import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import {
  ROLE,
  SCOPE,
  PASSWORD_POLICY,
  IDENTITY_LIMITS as A,
} from '../../shared/identity.constants';
import {
  INVITE_STATUS as S,
  INVITE_TOKEN as T,
  PROPERTY_LIMITS as L,
} from '../../shared/property.constants';
export class CreateInvitationDto {
  @ApiProperty({ type: String, format: 'email' }) @IsEmail() @MaxLength(L.ADDRESS) email!: string;
  @ApiProperty({ type: String, enum: Object.values(ROLE) })
  @IsIn(Object.values(ROLE))
  roleKey!: string;
  @ApiProperty({ type: String, enum: Object.values(SCOPE) })
  @IsIn(Object.values(SCOPE))
  scopeType!: (typeof SCOPE)[keyof typeof SCOPE];
  @ApiPropertyOptional({ type: String, format: 'uuid' }) @IsOptional() @IsUUID() scopeId?: string;
}
export class AcceptInvitationDto {
  @ApiProperty({ type: String, minLength: T.LENGTH, maxLength: T.LENGTH })
  @IsString()
  @Matches(/^[\da-f]{64}$/i)
  token!: string;
  @ApiProperty({ type: String }) @IsString() @MinLength(1) @MaxLength(A.NAME_MAX) fullName!: string;
  @ApiProperty({ type: String, minLength: A.PASSWORD_MIN, maxLength: A.PASSWORD_MAX })
  @IsString()
  @Matches(PASSWORD_POLICY)
  password!: string;
}
export class InvitationListDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(L.CURSOR)
  cursor?: string;
  @ApiPropertyOptional({ type: String, format: 'uuid' }) @IsOptional() @IsUUID() scopeId?: string;
  @ApiPropertyOptional({ type: String, enum: Object.values(S) })
  @IsOptional()
  @IsIn(Object.values(S))
  status?: string;
}
export class InvitationDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String }) email!: string;
  @ApiProperty({ type: String, enum: Object.values(ROLE) }) roleKey!: string;
  @ApiProperty({ type: String, enum: Object.values(SCOPE) }) scopeType!: string;
  @ApiProperty({ type: String, format: 'uuid' }) scopeId!: string;
  @ApiProperty({ type: String, enum: Object.values(S) }) status!: string;
  @ApiProperty({ type: String, format: 'date-time' }) expiresAt!: Date;
  @ApiProperty({ type: String, enum: ['en', 'hi'] }) locale!: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}
export class InvitationAcceptedDto {
  @ApiProperty({ type: Boolean }) accepted!: boolean;
  @ApiProperty({ type: String, enum: Object.values(ROLE) }) roleKey!: string;
  @ApiProperty({ type: String, enum: ['en', 'hi'] }) locale!: string;
}
