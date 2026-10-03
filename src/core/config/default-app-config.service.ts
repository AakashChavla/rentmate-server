import { Injectable } from '@nestjs/common';
import { AppConfig } from './app-config.contract';
import { envSchema, type AppEnvironment } from './env.schema';
import { INTERNAL_MESSAGES } from './config.constants';
@Injectable()
export class AppConfigService extends AppConfig {
  private readonly values: AppEnvironment;
  public constructor() {
    super();
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) throw new Error(INTERNAL_MESSAGES.CONFIG);
    this.values = parsed.data;
  }
  public override get<K extends keyof AppEnvironment>(key: K): AppEnvironment[K] {
    return this.values[key];
  }
}
export { AppConfigService as DefaultAppConfig };
