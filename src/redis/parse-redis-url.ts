export interface RedisConnectionOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: Record<string, never>;
}

export function parseRedisUrl(redisUrl: string): RedisConnectionOptions {
  const url = new URL(redisUrl);
  const database = url.pathname.length > 1 ? Number(url.pathname.slice(1)) : undefined;
  const connection: RedisConnectionOptions = {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
  };

  if (url.username) {
    connection.username = decodeURIComponent(url.username);
  }

  if (url.password) {
    connection.password = decodeURIComponent(url.password);
  }

  if (database !== undefined && !Number.isNaN(database)) {
    connection.db = database;
  }

  if (url.protocol === 'rediss:') {
    connection.tls = {};
  }

  return connection;
}
