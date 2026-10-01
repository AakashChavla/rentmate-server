import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ScopeType } from '../../authorization/scope-type';

export class AssignRoleDto {
  @ApiProperty({ example: 'PROPERTY_MANAGER' })
  @IsString()
  roleKey!: string;

  @ApiProperty({ enum: ScopeType })
  @IsEnum(ScopeType)
  scopeType!: ScopeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  scopeId?: string;
}
