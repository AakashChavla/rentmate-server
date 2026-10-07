import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TENANT_STATUS as T, LEASE_LIMIT as L } from '../../shared/lease.constants';
import type { TenantStatus } from '../../shared/lease.types';

export class TenantInputDto {
  @ApiProperty({ type: String, format: 'uuid' }) @IsUUID() propertyId!: string;
  @ApiProperty({ type: String }) @IsString() @MinLength(1) @MaxLength(L.NAME) fullName!: string;
  @ApiProperty({ type: String }) @IsString() @MinLength(1) @MaxLength(L.PHONE) phone!: string;
  @ApiProperty({ type: String }) @IsEmail() @MaxLength(L.NAME) email!: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(L.REASON)
  emergencyContact?: string;
  @ApiPropertyOptional({ type: String, writeOnly: true })
  @IsOptional()
  @IsString()
  @MinLength(L.ID_MIN)
  @MaxLength(L.ID_MAX)
  idNumber?: string;
}
export class TenantPatchDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(L.NAME)
  fullName?: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(L.PHONE)
  phone?: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(L.REASON)
  emergencyContact?: string;
}
export class TenantReviewDto {
  @ApiProperty({ type: String, enum: [T.VERIFIED, T.REJECTED, T.INACTIVE] })
  @IsEnum(T)
  status!: TenantStatus;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(L.REASON)
  reason?: string;
}
export class DomainFilterDto {
  @ApiPropertyOptional({ type: String, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;
  @ApiPropertyOptional({ type: String, format: 'uuid' }) @IsOptional() @IsUUID() tenantId?: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(L.NAME)
  status?: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(L.NAME)
  search?: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(L.REASON)
  cursor?: string;
}
export class TenantDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) organizationId!: string;
  @ApiProperty({ type: String }) propertyId!: string;
  @ApiProperty({ type: String }) fullName!: string;
  @ApiProperty({ type: String }) phone!: string;
  @ApiProperty({ type: String }) email!: string;
  @ApiProperty({ type: String, enum: Object.values(T) }) status!: TenantStatus;
  @ApiProperty({ type: String, nullable: true }) userId!: string | null;
  @ApiProperty({ type: String, nullable: true }) emergencyContact!: string | null;
  @ApiProperty({ type: String, nullable: true }) maskedId!: string | null;
  @ApiProperty({ type: String, nullable: true }) reviewReason!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}
