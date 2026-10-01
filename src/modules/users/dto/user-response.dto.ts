import { ApiProperty } from '@nestjs/swagger';
import { ScopeType } from '../../authorization/scope-type';
import { UserStatus } from '../entities/user.entity';

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
