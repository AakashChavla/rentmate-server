import { Inject, Injectable } from '@nestjs/common';
import { createClient } from 'redis';
import { AppConfig } from '../config/app-config.contract';
import { KeyValueStore } from './key-value-store.contract';
import { REDIS } from './redis.constants';
@Injectable()
export class RedisKeyValueStore extends KeyValueStore {
  private readonly client: ReturnType<typeof createClient>;
  public constructor(@Inject(AppConfig) config: AppConfig) {
    super();
    this.client = createClient({
      url: config.get('REDIS_URL'),
      socket: { reconnectStrategy: false },
      disableOfflineQueue: true,
    });
    this.client.on('error', () => undefined);
  }
  public override async connect(): Promise<void> {
    if (!this.client.isOpen) await this.client.connect();
  }
  public override async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }
  public override async set(key: string, value: string, ttlMs: number): Promise<void> {
    await this.client.set(key, value, { PX: ttlMs });
  }
  public override async setIfCurrent(
    key: string,
    value: string,
    ttlMs: number,
    versionKey: string,
    expected: string,
  ): Promise<boolean> {
    return !!(await this.client.eval(REDIS.SET_IF_CURRENT, {
      keys: [key, versionKey],
      arguments: [value, String(ttlMs), expected],
    }));
  }
  public override async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
  public override async incrementWindow(key: string, ttlMs: number): Promise<number> {
    return Number(
      await this.client.eval(REDIS.COUNT_WINDOW, { keys: [key], arguments: [String(ttlMs)] }),
    );
  }
  public override async ping(): Promise<boolean> {
    await this.client.ping();
    return true;
  }
  public override close(): Promise<void> {
    if (this.client.isOpen) this.client.destroy();
    return Promise.resolve();
  }
}
