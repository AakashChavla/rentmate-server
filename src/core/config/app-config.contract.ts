import type { AppEnvironment } from './env.schema';
export abstract class AppConfig {
  public abstract get<K extends keyof AppEnvironment>(key: K): AppEnvironment[K];
}
