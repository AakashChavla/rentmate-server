import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { USER_STATUS, SCOPE, ROLE } from '../../../shared/identity.constants';
export class UserDto {
  @ApiPropertyOptional({ type: () => [RoleAssignmentDto] }) roles?: RoleAssignmentDto[];
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'uuid' }) organizationId!: string;
  @ApiProperty({ type: String }) email!: string;
  @ApiProperty({ type: String }) fullName!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) phone!: string | null;
  @ApiProperty({ type: String, enum: ['en', 'hi'] }) locale!: string;
  @ApiProperty({ type: String, enum: Object.values(USER_STATUS) }) status!: string;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) emailVerifiedAt!: Date | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) lastLoginAt!: Date | null;
  @ApiProperty({ type: Boolean }) isPlatformAdmin!: boolean;
  @ApiProperty({ format: 'date-time', type: String }) createdAt!: Date;
}
export class OrganizationDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String }) slug!: string;
  @ApiProperty({ type: String }) timezone!: string;
  @ApiProperty({ type: String, enum: ['en', 'hi'] }) defaultLocale!: string;
  @ApiProperty({ type: Boolean }) isActive!: boolean;
}
export class RoleAssignmentDto {
  @ApiPropertyOptional({ type: [String] }) permissions?: string[];
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'uuid' }) userId!: string;
  @ApiProperty({ type: String, format: 'uuid' }) organizationId!: string;
  @ApiProperty({ type: String, enum: Object.values(ROLE) }) role!: string;
  @ApiProperty({ type: String, enum: Object.values(SCOPE) }) scope!: string;
  @ApiProperty({ type: String, format: 'uuid' }) scopeId!: string;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) expiresAt!: Date | null;
}
export class OnboardingStepDto {
  @ApiProperty({ type: String }) key!: string;
  @ApiProperty({ type: Boolean }) done!: boolean;
}
export class OnboardingDto {
  @ApiProperty({ type: [OnboardingStepDto] }) steps!: OnboardingStepDto[];
}
export class MeDto {
  @ApiProperty({ type: UserDto }) user!: UserDto;
  @ApiProperty({ type: OrganizationDto }) organization!: OrganizationDto;
  @ApiProperty({ type: [RoleAssignmentDto] }) roles!: RoleAssignmentDto[];
  @ApiProperty({ type: [String] }) permissions!: string[];
  @ApiProperty({ type: Boolean }) isPlatformAdmin!: boolean;
  @ApiProperty({ type: OnboardingDto }) onboarding!: OnboardingDto;
}
