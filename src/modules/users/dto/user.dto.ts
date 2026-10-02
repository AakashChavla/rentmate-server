import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ScopeType } from '../../authorization/types/scope-type';
import { UserStatus } from '../types/user-status';

export class ListUsersQueryDto {
  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

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

export class UserRoleDto {
  @ApiProperty()
  key!: string;

  @ApiProperty({ enum: ScopeType })
  scopeType!: ScopeType;

  @ApiProperty()
  scopeId!: string;
}

export class UserViewDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty({ nullable: true })
  lastLoginAt!: Date | null;

  @ApiProperty({ type: [UserRoleDto] })
  roles!: UserRoleDto[];
}

export class RoleAssignmentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  roleKey!: string;

  @ApiProperty({ enum: ScopeType })
  scopeType!: ScopeType;

  @ApiProperty()
  scopeId!: string;
}
