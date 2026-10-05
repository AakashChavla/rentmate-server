import { isProvided } from '../../shared/input-validation';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ValidateIf, IsString, IsIn, IsObject, MaxLength, MinLength } from 'class-validator';
import { SUPPORTED_LOCALES, type Locale } from '../../shared/locale.constants';
import { PROPERTY_LIMITS as L } from '../../shared/property.constants';
export class OrganizationUpdateDto {
  @ApiPropertyOptional({ type: String })
  @ValidateIf(isProvided)
  @IsString()
  @MinLength(1)
  @MaxLength(L.NAME)
  name?: string;
  @ApiPropertyOptional({ type: String })
  @ValidateIf(isProvided)
  @IsString()
  @MinLength(1)
  @MaxLength(L.TIMEZONE)
  timezone?: string;
  @ApiPropertyOptional({ type: String, enum: SUPPORTED_LOCALES })
  @ValidateIf(isProvided)
  @IsIn(SUPPORTED_LOCALES)
  defaultLocale?: Locale;
  @ApiPropertyOptional({ type: Object, additionalProperties: true })
  @ValidateIf(isProvided)
  @IsObject()
  settings?: Record<string, unknown>;
}
export class OrganizationDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String }) slug!: string;
  @ApiProperty({ type: String }) timezone!: string;
  @ApiProperty({ type: String, enum: SUPPORTED_LOCALES }) defaultLocale!: Locale;
  @ApiProperty({ type: Object, additionalProperties: true }) settings!: Record<string, unknown>;
  @ApiProperty({ type: Boolean }) isActive!: boolean;
}
