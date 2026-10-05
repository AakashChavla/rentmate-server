export const REDIS = {
  SET_IF_CURRENT:
    "if (redis.call('GET',KEYS[2]) or '0') ~= ARGV[3] then return 0 end; if KEYS[3] and (redis.call('GET',KEYS[3]) or '0') ~= ARGV[4] then return 0 end; redis.call('SET',KEYS[1],ARGV[1],'PX',ARGV[2]); return 1;",
  PONG: 'PONG',
  PX: 'PX',
  WAIT: 'wait',
  COUNT_WINDOW:
    "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); end; return n;",
} as const;
