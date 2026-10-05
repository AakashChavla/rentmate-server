import { isProvided } from '../../shared/input-validation';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  ValidateIf,
  IsIn,
  IsObject,
  MaxLength,
  MinLength,
  IsInt,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  PROPERTY_TYPE as T,
  PROPERTY_STATUS as S,
  PROPERTY_LIMITS as L,
  PROPERTY_DEFAULTS as D,
} from '../../shared/property.constants';
import type { PropertyType, PropertyStatus } from '../../shared/property.types';
export class PropertyConfigDto {
  @ApiProperty({ type: String, enum: [D.CURRENCY] }) @IsString() currency!: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() checkInTime?: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @IsString() checkOutTime?: string;
  @ApiPropertyOptional({ type: Number }) @IsOptional() @IsInt() rentDueDay?: number;
  @ApiPropertyOptional({ type: Number }) @IsOptional() @IsInt() graceDays?: number;
}
export class UpdatePropertyConfigDto extends PartialType(PropertyConfigDto) {}
export class CreatePropertyDto {
  @ApiProperty({ type: String }) @IsString() @MinLength(1) @MaxLength(L.NAME) name!: string;
  @ApiProperty({ type: String, enum: Object.values(T) })
  @IsIn(Object.values(T))
  type!: PropertyType;
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(L.ADDRESS)
  addressLine1!: string;
  @ApiPropertyOptional({ type: String })
  @ValidateIf(isProvided)
  @IsString()
  @MaxLength(L.ADDRESS)
  addressLine2?: string;
  @ApiProperty({ type: String }) @IsString() @MinLength(1) @MaxLength(L.CITY) city!: string;
  @ApiProperty({ type: String }) @IsString() @MinLength(1) @MaxLength(L.CITY) state!: string;
  @ApiProperty({ type: String }) @IsString() @MinLength(1) @MaxLength(L.POSTAL) postalCode!: string;
  @ApiPropertyOptional({ type: String, default: D.COUNTRY })
  @ValidateIf(isProvided)
  @IsString()
  @MinLength(L.COUNTRY)
  @MaxLength(L.COUNTRY)
  country?: string;
  @ApiPropertyOptional({ type: String })
  @ValidateIf(isProvided)
  @IsString()
  @MinLength(1)
  @MaxLength(L.TIMEZONE)
  timezone?: string;
  @ApiPropertyOptional({ type: PropertyConfigDto })
  @ValidateIf(isProvided)
  @IsObject()
  configuration?: PropertyConfigDto;
}
export class UpdatePropertyDto {
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
  @MaxLength(L.ADDRESS)
  addressLine1?: string;
  @ApiPropertyOptional({ type: String })
  @ValidateIf(isProvided)
  @IsString()
  @MaxLength(L.ADDRESS)
  addressLine2?: string;
  @ApiPropertyOptional({ type: String })
  @ValidateIf(isProvided)
  @IsString()
  @MinLength(1)
  @MaxLength(L.CITY)
  city?: string;
  @ApiPropertyOptional({ type: String })
  @ValidateIf(isProvided)
  @IsString()
  @MinLength(1)
  @MaxLength(L.CITY)
  state?: string;
  @ApiPropertyOptional({ type: String })
  @ValidateIf(isProvided)
  @IsString()
  @MinLength(1)
  @MaxLength(L.POSTAL)
  postalCode?: string;
  @ApiPropertyOptional({ type: String })
  @ValidateIf(isProvided)
  @IsString()
  @MinLength(L.COUNTRY)
  @MaxLength(L.COUNTRY)
  country?: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(L.TIMEZONE)
  timezone?: string | null;
  @ApiPropertyOptional({ type: String, enum: Object.values(S) })
  @ValidateIf(isProvided)
  @IsIn(Object.values(S))
  status?: PropertyStatus;
}
export class PropertyListDto {
  @ApiPropertyOptional({ type: String, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(L.CURSOR)
  cursor?: string;
  @ApiPropertyOptional({ type: String, enum: Object.values(T) })
  @IsOptional()
  @IsIn(Object.values(T))
  type?: PropertyType;
  @ApiPropertyOptional({ type: String, enum: Object.values(S) })
  @IsOptional()
  @IsIn(Object.values(S))
  status?: PropertyStatus;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(L.NAME)
  search?: string;
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === MINE_VALUE)
  @IsIn([true, false])
  mine?: boolean;
}
const MINE_VALUE = 'true';
export class PropertyDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'uuid' }) organizationId!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String, enum: Object.values(T) }) type!: PropertyType;
  @ApiProperty({ type: String }) addressLine1!: string;
  @ApiProperty({ type: String, nullable: true }) addressLine2!: string | null;
  @ApiProperty({ type: String }) city!: string;
  @ApiProperty({ type: String }) state!: string;
  @ApiProperty({ type: String }) postalCode!: string;
  @ApiProperty({ type: String }) country!: string;
  @ApiProperty({ type: String, nullable: true }) timezone!: string | null;
  @ApiProperty({ type: String, enum: Object.values(S) }) status!: PropertyStatus;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}
