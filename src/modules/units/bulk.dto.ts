import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Length, IsInt, Min, Max, IsEnum, Matches } from 'class-validator';
import { Type } from 'class-transformer';

import {
  UNIT_TYPE as T,
  UNIT_LIMITS as L,
  UNIT_DEFAULTS as D,
  MONEY_PATTERN,
  PREFIX_PATTERN,
  BULK_STATUS as B,
  BULK_MODE as M,
  BULK_MAX_UNITS,
} from '../../shared/unit.constants';
import type { UnitType } from '../../shared/unit.types';
export class BulkPatternDto {
  @ApiProperty({ type: Number, minimum: 1, maximum: L.FLOORS })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(L.FLOORS)
  floors!: number;
  @ApiProperty({ type: Number, minimum: 1, maximum: L.PER_FLOOR })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(L.PER_FLOOR)
  perFloor!: number;
  @ApiProperty({ type: String }) @IsString() @Matches(PREFIX_PATTERN) prefix!: string;
  @ApiPropertyOptional({ type: Number, default: D.START_FLOOR })
  @Type(() => Number)
  @IsInt()
  @Min(L.START_FLOOR_MIN)
  @Max(L.START_FLOOR_MAX)
  startFloor: number = D.START_FLOOR;
  @ApiPropertyOptional({ type: Number, default: D.START_NUMBER })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(BULK_MAX_UNITS)
  startNumber: number = D.START_NUMBER;
  @ApiPropertyOptional({ type: String, default: D.WING })
  @IsString()
  @Length(0, L.WING)
  wing: string = D.WING;
  @ApiPropertyOptional({ enum: Object.values(T), default: T.ROOM }) @IsEnum(T) type: UnitType =
    T.ROOM;
  @ApiPropertyOptional({ type: String, default: D.RENT }) @Matches(MONEY_PATTERN) baseRent: string =
    D.RENT;
  @ApiPropertyOptional({ type: Number, default: D.CAPACITY })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(L.CAPACITY)
  capacity: number = D.CAPACITY;
}
export class BulkResultDto {
  @ApiProperty({ enum: Object.values(M) }) mode!: 'SYNC' | 'QUEUED';
  @ApiProperty({ type: Number }) createdCount!: number;
  @ApiProperty({ type: String, nullable: true }) jobId!: string | null;
  @ApiProperty({ enum: Object.values(B) }) status!: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
}
export class BulkJobDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) organizationId!: string;
  @ApiProperty({ type: String }) propertyId!: string;
  @ApiProperty({ type: String }) requestedBy!: string;
  @ApiProperty({ type: BulkPatternDto }) pattern!: BulkPatternDto;
  @ApiProperty({ enum: Object.values(B) }) status!: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  @ApiProperty({ type: Number }) createdCount!: number;
  @ApiProperty({ type: String, nullable: true }) errorCode!: string | null;
  @ApiProperty({ type: Date }) createdAt!: Date;
}
