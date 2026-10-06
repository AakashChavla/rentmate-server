import { FloorRepository } from './modules/units';
import { TypeOrmFloorRepository } from './modules/units/typeorm-floor.repository';
import { UnitRepository } from './modules/units';
import { TypeOrmUnitRepository } from './modules/units/typeorm-unit.repository';
import { UnitPolicy } from './modules/units';
import { DefaultUnitPolicy } from './modules/units/default-unit-policy.service';
import { UnitEffects } from './modules/units';
import { DefaultUnitEffects } from './modules/units/default-unit-effects.service';
import { FloorsService } from './modules/units';
import { DefaultFloorsService } from './modules/units/default-floors.service';
import { UnitsService } from './modules/units';
import { DefaultUnitsService } from './modules/units/default-units.service';
import { BulkUnitWriter } from './modules/units';
import { DefaultBulkUnitWriter } from './modules/units/default-bulk-unit-writer.service';
import { BulkJobRepository } from './modules/units';
import { TypeOrmBulkJobRepository } from './modules/units/typeorm-bulk-job.repository';
import { BulkUnitsService } from './modules/units';
import { DefaultBulkUnitsService } from './modules/units/default-bulk-units.service';
import { BulkUnitsJob } from './modules/units';
import { DefaultBulkUnitsJob } from './modules/units/default-bulk-units.processor';
import { BedRepository } from './modules/beds';
import { TypeOrmBedRepository } from './modules/beds/typeorm-bed.repository';
import { BedsService } from './modules/beds';
import { DefaultBedsService } from './modules/beds/default-beds.service';
import { OccupancyStore } from './modules/occupancy';
import { RedisOccupancyStore } from './modules/occupancy/redis-occupancy.store';
import { OccupancyReadModel } from './modules/occupancy';
import { DefaultOccupancyReadModel } from './modules/occupancy/default-occupancy-read-model.service';
import { FloorsController } from './modules/units/floors.controller';
import { UnitsController } from './modules/units/units.controller';
import { BulkUnitsController } from './modules/units/bulk-units.controller';
import { BedsController } from './modules/beds/beds.controller';
import { OccupancyController } from './modules/occupancy/occupancy.controller';
import {
  OrganizationService,
  OrganizationPropertyDirectory,
  InvitationRepository,
  InvitationsService,
  InvitationPolicy,
} from './modules/organizations';
import { DefaultOrganizationService } from './modules/organizations/default-organization.service';
import { OrganizationController } from './modules/organizations/organization.controller';
import { TypeOrmInvitationRepository } from './modules/organizations/typeorm-invitation.repository';
import { DefaultInvitationsService } from './modules/organizations/default-invitations.service';
import { DefaultInvitationPolicy } from './modules/organizations/default-invitation-policy.service';
import { InvitationsController } from './modules/organizations/invitations.controller';
import { PropertyRepository, PropertiesService } from './modules/properties';
import { TypeOrmPropertyRepository } from './modules/properties/typeorm-property.repository';
import { DefaultPropertiesService } from './modules/properties/default-properties.service';
import { PropertiesController } from './modules/properties/properties.controller';
import { InvitationToken } from './integrations/invitation-token/invitation-token.contract';
import { CryptoInvitationToken } from './integrations/invitation-token/adapters/crypto/crypto-invitation-token';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CoreModule } from './core/core.module';
import { SecurityEventLogger } from './core/logger/security-event-logger.contract';
import { PinoSecurityEventLogger } from './core/logger/pino-security-event-logger';
import { PasswordHasher } from './integrations/password/password-hasher.contract';
import { Argon2PasswordHasher } from './integrations/password/adapters/argon2/argon2-password-hasher';
import { TokenSigner } from './integrations/tokens/token-signer.contract';
import { JoseTokenSigner } from './integrations/tokens/adapters/jose/jose-token-signer';
import { OtpGenerator } from './integrations/otp/otp-generator.contract';
import { CryptoOtpGenerator } from './integrations/otp/adapters/crypto/crypto-otp-generator';
import { EmailProvider } from './integrations/email/email-provider.contract';
import { SmtpEmailProvider } from './integrations/email/adapters/smtp/smtp-email-provider';
import { EmailPolicy } from './integrations/email-policy/email-policy.contract';
import { BlocklistEmailPolicy } from './integrations/email-policy/adapters/blocklist/blocklist-email-policy';
import { BotProtection } from './integrations/bot/bot-protection.contract';
import { NoneBotProtection } from './integrations/bot/adapters/none/none-bot-protection';
import { OrganizationRepository, OrganizationDirectory } from './modules/organizations';
import { TypeOrmOrganizationRepository } from './modules/organizations/typeorm-organization.repository';
import { UserRepository, UserDirectory, UsersService } from './modules/users';
import { TypeOrmUserRepository } from './modules/users/typeorm-user.repository';
import { DefaultUsersService } from './modules/users/default-users.service';
import { UsersController } from './modules/users/users.controller';
import {
  RoleRepository,
  PermissionContextStore,
  PermissionContextLoader,
  PermissionChecker,
} from './modules/authorization';
import { TypeOrmRoleRepository } from './modules/authorization/typeorm-role.repository';
import { RedisPermissionContextStore } from './modules/authorization/redis-permission-context.store';
import { DefaultPermissionContextLoader } from './modules/authorization/default-permission-context-loader.service';
import { DefaultPermissionService } from './modules/authorization/default-permission.service';
import { JwtAuthGuard } from './modules/authorization/jwt-auth.guard';
import { RolesController } from './modules/authorization/roles.controller';
import { AuthRepository } from './modules/auth/repositories/auth.repository.contract';
import { TypeOrmAuthRepository } from './modules/auth/repositories/typeorm-auth.repository';
import { AuthService } from './modules/auth/auth.service.contract';
import { DefaultAuthService } from './modules/auth/default-auth.service';
import { SessionService } from './modules/auth/session.service.contract';
import { SessionVerifier, SessionRevoker } from './modules/auth';
import { DefaultSessionService } from './modules/auth/default-session.service';
import { OtpService } from './modules/auth/otp.service.contract';
import { DefaultOtpService } from './modules/auth/default-otp.service';
import { LoginLockout } from './modules/auth/login-lockout.contract';
import { RedisLoginLockout } from './modules/auth/redis-login-lockout.store';
import { AuthController } from './modules/auth/auth.controller';
import { AuthCookies } from './modules/auth/auth-cookies';
import { AuthThrottleGuard } from './modules/auth/auth-throttle.guard';
import { RegistrationCleanup } from './modules/auth/registration-cleanup.contract';
import { DefaultRegistrationCleanup } from './modules/auth/default-registration-cleanup.processor';
import { EmailJob } from './integrations/email/email-job.contract';
import { DefaultEmailJob } from './integrations/email/default-email-job';
@Module({
  imports: [CoreModule],
  controllers: [
    FloorsController,
    UnitsController,
    BulkUnitsController,
    BedsController,
    OccupancyController,
    AuthController,
    UsersController,
    RolesController,
    OrganizationController,
    PropertiesController,
    InvitationsController,
  ],
  providers: [
    { provide: FloorRepository, useClass: TypeOrmFloorRepository },
    { provide: UnitRepository, useClass: TypeOrmUnitRepository },
    { provide: UnitPolicy, useClass: DefaultUnitPolicy },
    { provide: UnitEffects, useClass: DefaultUnitEffects },
    { provide: FloorsService, useClass: DefaultFloorsService },
    { provide: UnitsService, useClass: DefaultUnitsService },
    { provide: BulkUnitWriter, useClass: DefaultBulkUnitWriter },
    { provide: BulkJobRepository, useClass: TypeOrmBulkJobRepository },
    { provide: BulkUnitsService, useClass: DefaultBulkUnitsService },
    { provide: BulkUnitsJob, useClass: DefaultBulkUnitsJob },
    { provide: BedRepository, useClass: TypeOrmBedRepository },
    { provide: BedsService, useClass: DefaultBedsService },
    { provide: OccupancyStore, useClass: RedisOccupancyStore },
    { provide: OccupancyReadModel, useClass: DefaultOccupancyReadModel },
    { provide: OrganizationService, useClass: DefaultOrganizationService },
    { provide: OrganizationPropertyDirectory, useClass: TypeOrmPropertyRepository },
    { provide: PropertyRepository, useClass: TypeOrmPropertyRepository },
    { provide: PropertiesService, useClass: DefaultPropertiesService },
    { provide: InvitationRepository, useClass: TypeOrmInvitationRepository },
    { provide: InvitationsService, useClass: DefaultInvitationsService },
    { provide: InvitationPolicy, useClass: DefaultInvitationPolicy },
    { provide: InvitationToken, useClass: CryptoInvitationToken },
    { provide: SecurityEventLogger, useClass: PinoSecurityEventLogger },
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: TokenSigner, useClass: JoseTokenSigner },
    { provide: OtpGenerator, useClass: CryptoOtpGenerator },
    { provide: EmailProvider, useClass: SmtpEmailProvider },
    { provide: EmailPolicy, useClass: BlocklistEmailPolicy },
    { provide: BotProtection, useClass: NoneBotProtection },
    { provide: OrganizationRepository, useClass: TypeOrmOrganizationRepository },
    { provide: OrganizationDirectory, useClass: TypeOrmOrganizationRepository },
    { provide: UserRepository, useClass: TypeOrmUserRepository },
    { provide: UserDirectory, useClass: TypeOrmUserRepository },
    { provide: UsersService, useClass: DefaultUsersService },
    { provide: RoleRepository, useClass: TypeOrmRoleRepository },
    { provide: PermissionContextStore, useClass: RedisPermissionContextStore },
    { provide: PermissionContextLoader, useClass: DefaultPermissionContextLoader },
    { provide: PermissionChecker, useClass: DefaultPermissionService },
    { provide: AuthRepository, useClass: TypeOrmAuthRepository },
    { provide: AuthService, useClass: DefaultAuthService },
    { provide: SessionService, useClass: DefaultSessionService },
    { provide: SessionVerifier, useClass: DefaultSessionService },
    { provide: SessionRevoker, useClass: DefaultSessionService },
    { provide: OtpService, useClass: DefaultOtpService },
    { provide: LoginLockout, useClass: RedisLoginLockout },
    { provide: RegistrationCleanup, useClass: DefaultRegistrationCleanup },
    { provide: EmailJob, useClass: DefaultEmailJob },
    AuthCookies,
    AuthThrottleGuard,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [
    FloorRepository,
    UnitRepository,
    UnitPolicy,
    UnitEffects,
    FloorsService,
    UnitsService,
    BulkUnitWriter,
    BulkJobRepository,
    BulkUnitsService,
    BulkUnitsJob,
    BedRepository,
    BedsService,
    OccupancyStore,
    OccupancyReadModel,
    PropertyRepository,
    PropertiesService,
    InvitationRepository,
    InvitationsService,
    OrganizationRepository,
    OrganizationService,
    OrganizationPropertyDirectory,
    InvitationToken,
    PermissionContextStore,
    AuthRepository,
    EmailProvider,
    SessionService,
    AuthService,
    UserRepository,
    RoleRepository,
    PermissionContextLoader,
    SessionRevoker,
    OtpService,
    RegistrationCleanup,
    EmailJob,
  ],
})
export class IdentityModule {}
