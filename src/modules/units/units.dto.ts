import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import {
  IsString,
  Length,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsArray,
  ArrayMaxSize,
  IsUUID,
  IsOptional,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { isProvided } from '../../shared/input-validation';
import {
  UNIT_STATUS as S,
  UNIT_TYPE as T,
  UNIT_LIMITS as L,
  AMENITY as A,
  FURNISHING as F,
  MONEY_PATTERN,
  SIZE_PATTERN,
  BULK_MAX_UNITS,
} from '../../shared/unit.constants';
import type { UnitStatus, UnitType, Amenity, Furnishing } from '../../shared/unit.types';
export class FloorInputDto {
  @ApiProperty({ type: String }) @IsString() @Length(1, L.NAME) name!: string;
  @ApiProperty({ type: Number })
  @Type(() => Number)
  @IsInt()
  @Min(L.START_FLOOR_MIN)
  @Max(L.START_FLOOR_MAX)
  level!: number;
  @ApiPropertyOptional({ type: String })
  @ValidateIf(isProvided)
  @IsString()
  @Length(0, L.WING)
  wing?: string;
}
export class FloorPatchDto extends PartialType(FloorInputDto, { skipNullProperties: false }) {}
export class FloorDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) organizationId!: string;
  @ApiProperty({ type: String }) propertyId!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: Number }) level!: number;
  @ApiProperty({ type: String }) wing!: string;
  @ApiProperty({ type: Date }) createdAt!: Date;
}
export class UnitConfigDto {
  @ApiProperty({ enum: Object.values(A), isArray: true })
  @ValidateIf(isProvided)
  @IsArray()
  @ArrayMaxSize(L.AMENITIES)
  @IsEnum(A, { each: true })
  amenities!: Amenity[];
  @ApiProperty({ nullable: true, type: String }) @IsOptional() @Matches(SIZE_PATTERN) size!:
    string | null;
  @ApiProperty({ enum: Object.values(F) })
  @ValidateIf(isProvided)
  @IsEnum(F)
  furnishing!: Furnishing;
}
export class UnitConfigPatchDto extends PartialType(UnitConfigDto, { skipNullProperties: false }) {}
export class UnitInputDto {
  @ApiPropertyOptional({ nullable: true, type: String }) @IsOptional() @IsUUID() floorId?:
    string | null;
  @ApiProperty({ type: String }) @IsString() @Length(1, L.CODE) code!: string;
  @ApiProperty({ enum: Object.values(T) }) @IsEnum(T) type!: UnitType;
  @ApiProperty({ type: String, pattern: MONEY_PATTERN.source })
  @IsString()
  @Matches(MONEY_PATTERN)
  baseRent!: string;
  @ApiProperty({ type: Number, minimum: 1, maximum: L.CAPACITY })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(L.CAPACITY)
  capacity!: number;
  @ApiPropertyOptional({ type: UnitConfigPatchDto })
  @ValidateIf(isProvided)
  @ValidateNested()
  @Type(() => UnitConfigPatchDto)
  configuration?: UnitConfigPatchDto;
}
export class UnitPatchDto extends PartialType(OmitType(UnitInputDto, ['configuration'] as const), {
  skipNullProperties: false,
}) {}
export class UnitDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) organizationId!: string;
  @ApiProperty({ type: String }) propertyId!: string;
  @ApiProperty({ type: String, nullable: true }) floorId!: string | null;
  @ApiProperty({ type: String }) code!: string;
  @ApiProperty({ enum: Object.values(T) }) type!: UnitType;
  @ApiProperty({ enum: Object.values(S) }) status!: UnitStatus;
  @ApiProperty({ type: String, pattern: MONEY_PATTERN.source }) baseRent!: string;
  @ApiProperty({ type: Number }) capacity!: number;
  @ApiProperty({ type: Date }) createdAt!: Date;
  @ApiPropertyOptional({ type: String, nullable: true }) floorName?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) wing?: string | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) floorLevel?: number | null;
}
export class UnitStatusInputDto {
  @ApiProperty({ enum: Object.values(S) }) @IsEnum(S) status!: UnitStatus;
  @ApiPropertyOptional({ enum: Object.values(S) })
  @ValidateIf(isProvided)
  @IsEnum(S)
  expectedStatus?: UnitStatus;
}
export class UnitListDto {
  @ApiPropertyOptional({ type: String }) @ValidateIf(isProvided) @IsUUID() propertyId?: string;
  @ApiPropertyOptional({ type: String }) @ValidateIf(isProvided) @IsUUID() floorId?: string;
  @ApiPropertyOptional({ enum: Object.values(S) })
  @ValidateIf(isProvided)
  @IsEnum(S)
  status?: UnitStatus;
  @ApiPropertyOptional({ enum: Object.values(T) })
  @ValidateIf(isProvided)
  @IsEnum(T)
  type?: UnitType;
  @ApiPropertyOptional({ type: String })
  @ValidateIf(isProvided)
  @IsString()
  @Length(0, L.CODE)
  search?: string;
  @ApiPropertyOptional({ type: String })
  @ValidateIf(isProvided)
  @IsString()
  @Length(1, BULK_MAX_UNITS)
  cursor?: string;
}
