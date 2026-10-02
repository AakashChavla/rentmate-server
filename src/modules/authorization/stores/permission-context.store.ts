import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../core/redis/redis.constants';
import type { UserGrant } from '../contracts/permission-checker.contract';

const TTL_SECONDS = 15 * 60; // 15 minutes

@Injectable()
export class PermissionContextStore {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private getKey(userId: string): string {
    return `auth:context:${userId}`;
  }

  async get(userId: string): Promise<UserGrant[] | null> {
    const raw = await this.redis.get(this.getKey(userId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserGrant[];
    } catch {
      return null;
    }
  }

  async set(userId: string, grants: UserGrant[]): Promise<void> {
    await this.redis.set(this.getKey(userId), JSON.stringify(grants), 'EX', TTL_SECONDS);
  }

  async invalidate(userId: string): Promise<void> {
    await this.redis.del(this.getKey(userId));
  }
}
