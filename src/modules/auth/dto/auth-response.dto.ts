import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '../../users/entities/user.entity';

export class MeUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty()
  organizationId!: string;
}

export class MeOrganizationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  plan!: string;
}

export class MeRoleDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  scopeType!: string;

  @ApiProperty()
  scopeId!: string;
}

export class MeResponseDto {
  @ApiProperty({ type: MeUserDto })
  user!: MeUserDto;

  @ApiProperty({ type: MeOrganizationDto })
  organization!: MeOrganizationDto;

  @ApiProperty({ type: [MeRoleDto] })
  roles!: MeRoleDto[];

  @ApiProperty({ type: [String] })
  permissions!: string[];

  @ApiProperty()
  isPlatformAdmin!: boolean;
}

export class AcceptedDto {
  @ApiProperty({ example: true })
  accepted!: boolean;
}

export class LogoutDto {
  @ApiProperty({ example: true })
  loggedOut!: boolean;
}
