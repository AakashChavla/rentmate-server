import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import {
  DOCUMENT_STATUS as D,
  DOCUMENT_TYPE as Y,
  LEASE_LIMIT as L,
} from '../../shared/lease.constants';
import type { DocumentStatus, DocumentType } from '../../shared/lease.types';

export class DocumentReviewDto {
  @ApiProperty({ type: String, enum: [D.VERIFIED, D.REJECTED] }) @IsEnum(D) status!: DocumentStatus;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(L.REASON)
  reason?: string;
}
export class DocumentDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) organizationId!: string;
  @ApiProperty({ type: String }) propertyId!: string;
  @ApiProperty({ type: String }) tenantId!: string;
  @ApiProperty({ type: String, enum: Object.values(Y) }) type!: DocumentType;
  @ApiProperty({ type: String }) mime!: string;
  @ApiProperty({ type: Number }) size!: number;
  @ApiProperty({ type: String, enum: Object.values(D) }) status!: DocumentStatus;
  @ApiProperty({ type: String, nullable: true }) reviewedBy!: string | null;
  @ApiProperty({ type: String, nullable: true }) reviewReason!: string | null;
  @ApiProperty({ type: String }) createdAt!: Date;
}
export class SignedDocumentDto {
  @ApiProperty({ type: String }) url!: string;
  @ApiProperty({ type: String }) expiresAt!: string;
}
