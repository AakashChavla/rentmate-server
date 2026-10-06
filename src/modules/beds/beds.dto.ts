import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { UNIT_STATUS, UNIT_LIMITS } from '../../shared/unit.constants';
import type { UnitStatus } from '../../shared/unit.types';
export class BedInputDto {
  @ApiProperty({ type: String }) @IsString() @Length(1, UNIT_LIMITS.CODE) label!: string;
}
export class BedDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) organizationId!: string;
  @ApiProperty({ type: String }) propertyId!: string;
  @ApiProperty({ type: String }) unitId!: string;
  @ApiProperty({ type: String }) label!: string;
  @ApiProperty({ enum: Object.values(UNIT_STATUS) }) status!: UnitStatus;
  @ApiProperty({ type: Date }) createdAt!: Date;
}
