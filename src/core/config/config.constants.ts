export const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production',
} as const;
export const CONFIG_DEFAULTS = { PORT: 3000, MAX_PORT: 65535, LOG_LEVEL: 'info' } as const;
export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
export const HEALTH_STATUS = { OK: 'ok' } as const;
export const ROUTES = { LIVE: 'health/live' } as const;
export const HTTP_HEADERS = {
  REQUEST_ID: 'X-Request-ID',
  ACCEPT_LANGUAGE: 'accept-language',
  COOKIE: 'cookie',
} as const;
export const REDACTED_FIELDS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'req.body.password',
  'req.body.token',
  'req.body.code',
];
