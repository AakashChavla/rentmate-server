import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { OtpService } from './services/otp.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { SessionRevoker } from './contracts/session-revoker.contract';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { OtpVerificationRepository } from './repositories/otp-verification.repository';
import { UserRepository } from '../users/repositories/user.repository';
import { OtpVerification } from './entities/otp-verification.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { AuthorizationModule } from '../authorization/authorization.module';
import { NotificationsModule } from '../../core/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken, OtpVerification, User]),
    JwtModule.register({}),
    forwardRef(() => AuthorizationModule),
    NotificationsModule,
  ],
  controllers: [AuthController],
  providers: [
    RefreshTokenRepository,
    OtpVerificationRepository,
    UserRepository,
    PasswordService,
    TokenService,
    {
      provide: SessionRevoker,
      useExisting: TokenService,
    },
    OtpService,
    AuthService,
  ],
  exports: [SessionRevoker, TokenService, AuthService],
})
export class AuthModule {}
