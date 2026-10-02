import type { ThrottlerStorage } from '@nestjs/throttler';
import type { Redis } from 'ioredis';

type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

const INCREMENT_SCRIPT = `
local blockedTtl = redis.call('PTTL', KEYS[2])
if blockedTtl > 0 then
  local hits = tonumber(redis.call('GET', KEYS[1]) or '0')
  local hitTtl = redis.call('PTTL', KEYS[1])
  if hitTtl < 0 then hitTtl = 0 end
  return { hits, hitTtl, 1, blockedTtl }
end

local hits = redis.call('INCR', KEYS[1])
if hits == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local hitTtl = redis.call('PTTL', KEYS[1])
if hitTtl < 0 then hitTtl = tonumber(ARGV[1]) end

if hits > tonumber(ARGV[2]) then
  redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
  return { hits, hitTtl, 1, tonumber(ARGV[3]) }
end

return { hits, hitTtl, 0, 0 }
`;

/**
 * Redis-backed throttler storage. ttl and blockDuration are milliseconds.
 * Returned expiry fields are seconds, matching the built-in storage.
 */
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitsKey = `throttle:{${throttlerName}:${key}}:hits`;
    const blockKey = `throttle:{${throttlerName}:${key}}:blocked`;
    const result = (await this.redis.eval(
      INCREMENT_SCRIPT,
      2,
      hitsKey,
      blockKey,
      String(ttl),
      String(limit),
      String(blockDuration),
    )) as [number, number, number, number];

    const [totalHits, timeToExpireMs, blockedFlag, timeToBlockExpireMs] = result;

    return {
      totalHits: Number(totalHits),
      timeToExpire: toSeconds(Number(timeToExpireMs)),
      isBlocked: Number(blockedFlag) === 1,
      timeToBlockExpire: toSeconds(Number(timeToBlockExpireMs)),
    };
  }
}

function toSeconds(milliseconds: number): number {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return 0;
  }

  return Math.ceil(milliseconds / 1000);
}
