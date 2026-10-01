import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigService } from '../../config/app-config.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpVerification } from './otp-verification.entity';
import { OtpService } from './otp.service';
import { argonOptionsFor, PasswordService } from './password.service';
import { RefreshToken } from './refresh-token.entity';
import { TokenService } from './token.service';

@Module({
  imports: [
    JwtModule.register({}),
    NotificationsModule,
    TypeOrmModule.forFeature([RefreshToken, OtpVerification]),
    UsersModule,
    AuthorizationModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    OtpService,
    {
      provide: PasswordService,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        new PasswordService(argonOptionsFor(config.nodeEnv)),
    },
  ],
  exports: [AuthService, TokenService, PasswordService],
})
export class AuthModule {}
