import { createNodeRedisClient, RedisConnection } from 'bullmq';
import { createClient } from 'redis';

export function bullRedisConnection(url: string): { url: string } {
  RedisConnection.clientFactory = (options) =>
    createNodeRedisClient(createClient({ url: options.url ?? url }));
  return { url };
}
