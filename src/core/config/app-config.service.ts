import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from './env.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get nodeEnv(): AppConfig['nodeEnv'] {
    return this.config.getOrThrow<AppConfig['nodeEnv']>('nodeEnv');
  }

  get port(): number {
    return this.config.getOrThrow<number>('port');
  }

  get databaseUrl(): string {
    return this.config.getOrThrow<string>('databaseUrl');
  }

  get redisUrl(): string {
    return this.config.getOrThrow<string>('redisUrl');
  }

  get jwtAccessSecret(): string {
    return this.config.getOrThrow<string>('jwtAccessSecret');
  }

  get jwtRefreshSecret(): string {
    return this.config.getOrThrow<string>('jwtRefreshSecret');
  }

  get jwtAccessTtl(): string {
    return this.config.getOrThrow<string>('jwtAccessTtl');
  }

  get jwtRefreshTtl(): string {
    return this.config.getOrThrow<string>('jwtRefreshTtl');
  }

  get corsOrigins(): string[] {
    return this.config.getOrThrow<string[]>('corsOrigins');
  }

  get cookieDomain(): string | undefined {
    return this.config.get<string>('cookieDomain');
  }

  get paymentGateway(): string {
    return this.config.getOrThrow<string>('paymentGateway');
  }

  get razorpayKeyId(): string | undefined {
    return this.config.get<string>('razorpayKeyId');
  }

  get razorpayKeySecret(): string | undefined {
    return this.config.get<string>('razorpayKeySecret');
  }

  get razorpayWebhookSecret(): string | undefined {
    return this.config.get<string>('razorpayWebhookSecret');
  }

  get s3Bucket(): string | undefined {
    return this.config.get<string>('s3Bucket');
  }

  get s3Region(): string | undefined {
    return this.config.get<string>('s3Region');
  }

  get email(): AppConfig['email'] {
    return this.config.getOrThrow<AppConfig['email']>('email');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get authDevLogOtp(): boolean {
    return this.config.getOrThrow<boolean>('authDevLogOtp');
  }

  get seedSuperAdminEmail(): string | undefined {
    return this.config.get<string>('seedSuperAdminEmail');
  }

  get seedSuperAdminPassword(): string | undefined {
    return this.config.get<string>('seedSuperAdminPassword');
  }

  get seedDemoPassword(): string | undefined {
    return this.config.get<string>('seedDemoPassword');
  }
}
