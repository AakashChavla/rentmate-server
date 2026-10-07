import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
  MinLength,
  Matches,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { LEASE_STATUS as S, LEASE_LIMIT as L } from '../../shared/lease.constants';
import type { LeaseStatus } from '../../shared/lease.types';
import { MONEY_PATTERN } from '../../shared/unit.constants';

export class LeaseInputDto {
  @ApiProperty({ type: String, format: 'uuid' }) @IsUUID() tenantId!: string;
  @ApiProperty({ type: String, format: 'uuid' }) @IsUUID() unitId!: string;
  @ApiPropertyOptional({ type: String, nullable: true, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  bedId?: string | null;
  @ApiProperty({ type: String, format: 'date' }) @IsString() startDate!: string;
  @ApiProperty({ type: String, format: 'date' }) @IsString() endDate!: string;
  @ApiProperty({ type: String, pattern: MONEY_PATTERN.source })
  @Matches(MONEY_PATTERN)
  rent!: string;
  @ApiProperty({ type: String, pattern: MONEY_PATTERN.source })
  @Matches(MONEY_PATTERN)
  deposit!: string;
  @ApiProperty({ type: Number, minimum: 1, maximum: L.DUE_DAY })
  @IsInt()
  @Min(1)
  @Max(L.DUE_DAY)
  dueDay!: number;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(L.MEMBERS)
  @IsString({ each: true })
  @MaxLength(L.NAME, { each: true })
  members?: string[];
}
export class DepositDto {
  @ApiProperty({ type: String }) @IsString() @MinLength(1) @MaxLength(L.NAME) reference!: string;
}
export class TerminateDto {
  @ApiProperty({ type: String }) @IsString() @MinLength(1) @MaxLength(L.REASON) reason!: string;
}
export class AvailabilityDto {
  @ApiProperty({ type: Boolean }) available!: boolean;
}
export class LeaseDto extends OmitType(LeaseInputDto, ['bedId', 'members'] as const) {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) organizationId!: string;
  @ApiProperty({ type: String }) propertyId!: string;
  @ApiProperty({ type: String, nullable: true }) bedId!: string | null;
  @ApiProperty({ type: [String] }) members!: string[];
  @ApiProperty({ type: String, enum: Object.values(S) }) status!: LeaseStatus;
  @ApiProperty({ type: String, nullable: true }) renewedFromId!: string | null;
  @ApiProperty({ type: String, nullable: true }) terminatedAt!: Date | null;
  @ApiProperty({ type: String, nullable: true }) terminateReason!: string | null;
  @ApiProperty({ type: String, nullable: true }) depositRecordedAt!: Date | null;
  @ApiProperty({ type: String, nullable: true }) depositReference!: string | null;
  @ApiProperty({ type: String }) createdAt!: Date;
}

export class LeaseSummaryDto extends OmitType(LeaseDto, ['members'] as const) {}
