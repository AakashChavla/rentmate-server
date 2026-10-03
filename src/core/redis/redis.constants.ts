export const REDIS = {
  PONG: 'PONG',
  PX: 'PX',
  WAIT: 'wait',
  COUNT_WINDOW:
    "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); end; return n;",
} as const;
