import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { IDENTITY_LIMITS as L, USER_STATUS, ROLE, SCOPE } from '../../shared/identity.constants';
import { SUPPORTED_LOCALES, type Locale } from '../../shared/locale.constants';
const CURSOR_MAX = 512;
export class ProfileDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @Length(1, L.NAME_MAX)
  fullName?: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(L.PHONE_MAX)
  phone?: string;
  @ApiPropertyOptional({ type: String, enum: SUPPORTED_LOCALES })
  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  locale?: Locale;
}
export class UpdateUserDto extends ProfileDto {
  @ApiPropertyOptional({ type: String, enum: [USER_STATUS.ACTIVE, USER_STATUS.SUSPENDED] })
  @IsOptional()
  @IsIn([USER_STATUS.ACTIVE, USER_STATUS.SUSPENDED])
  status?: typeof USER_STATUS.ACTIVE | typeof USER_STATUS.SUSPENDED;
}
export class AssignRoleDto {
  @ApiProperty({ type: String, enum: Object.values(ROLE) })
  @IsIn(Object.values(ROLE))
  role!: string;
  @ApiProperty({ type: String, enum: Object.values(SCOPE) })
  @IsIn(Object.values(SCOPE))
  scope!: string;
  @ApiPropertyOptional({ type: String, format: 'uuid' }) @IsOptional() @IsUUID() scopeId?: string;
}
export class UserListDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(CURSOR_MAX)
  cursor?: string;
  @ApiPropertyOptional({ type: String, enum: Object.values(USER_STATUS) })
  @IsOptional()
  @IsIn(Object.values(USER_STATUS))
  status?: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(L.NAME_MAX)
  search?: string;
}
