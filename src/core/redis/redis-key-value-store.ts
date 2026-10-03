import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfig } from '../config/app-config.contract';
import { KeyValueStore } from './key-value-store.contract';
import { REDIS } from './redis.constants';
@Injectable()
export class RedisKeyValueStore extends KeyValueStore {
  private readonly client: Redis;
  public constructor(@Inject(AppConfig) config: AppConfig) {
    super();
    this.client = new Redis(config.get('REDIS_URL'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    this.client.on('error', () => undefined);
  }
  public override async connect(): Promise<void> {
    if (this.client.status === REDIS.WAIT) await this.client.connect();
  }
  public override async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }
  public override async set(key: string, value: string, ttlMs: number): Promise<void> {
    await this.client.set(key, value, REDIS.PX, ttlMs);
  }
  public override async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
  public override async incrementWindow(key: string, ttlMs: number): Promise<number> {
    return Number(await this.client.eval(REDIS.COUNT_WINDOW, 1, key, ttlMs));
  }
  public override async ping(): Promise<boolean> {
    await this.client.ping();
    return true;
  }
  public override close(): Promise<void> {
    this.client.disconnect();
    return Promise.resolve();
  }
}
