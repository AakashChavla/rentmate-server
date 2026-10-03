import { Injectable } from '@nestjs/common';
import { AppConfig } from './app-config.contract';
import { envSchema, type AppEnvironment } from './env.schema';
@Injectable()
export class DefaultAppConfig extends AppConfig {
  private readonly environment = envSchema.parse(process.env);
  public override get<K extends keyof AppEnvironment>(key: K): AppEnvironment[K] {
    return this.environment[key];
  }
}
