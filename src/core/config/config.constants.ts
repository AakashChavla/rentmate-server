import { minutes, seconds } from '../../shared/duration';
export const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production',
} as const;
export const CONFIG_DEFAULTS = {
  PORT: 3000,
  MAX_PORT: 65535,
  LOG_LEVEL: 'info',
  DB_HOST: 'localhost',
  DB_PORT: 5432,
  DB_NAME: 'rentmate',
  DB_USER: 'rentmate',
  DB_POOL_MAX: 10,
  DB_STATEMENT_TIMEOUT_MS: seconds(10),
  REDIS_URL: 'redis://localhost:6379',
  CORS_ORIGIN: 'http://localhost:3001',
  THROTTLE_LIMIT: 120,
  THROTTLE_WINDOW_MS: minutes(1),
  WORKER_CONCURRENCY: 5,
} as const;
export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
export const HEALTH_STATUS = { OK: 'ok', UNAVAILABLE: 'unavailable' } as const;
export const ROUTES = {
  LIVE: 'health/live',
  READY: 'health/ready',
  PREFIX: 'api/v1',
  DOCS: 'api/docs',
  SPEC: 'api/docs-json',
} as const;
export const HEADER_NAMES = {
  REQUEST_ID: 'X-Request-ID',
  ACCEPT_LANGUAGE: 'accept-language',
  COOKIE: 'cookie',
  ORIGIN: 'origin',
  RETRY_AFTER: 'Retry-After',
  AUTHORIZATION: 'authorization',
} as const;
export const HTTP_HEADERS = HEADER_NAMES;
export const COOKIE_NAMES = {
  ACCESS: 'rm_access',
  REFRESH: 'rm_refresh',
  SESSION: 'rm_session',
  LOCALE: 'NEXT_LOCALE',
} as const;
export const REDACTED_FIELDS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'req.body.password',
  'req.body.token',
  'req.body.code',
  'password',
  'token',
  'code',
];
export const LIMITS = {
  MAX_PAGE_SIZE: 100,
  REQUEST_ID_LENGTH: 100,
  BODY_SIZE: '1mb',
  EXIT_FAILURE: 1,
  JOB_ATTEMPTS: 5,
  RETAIN_COMPLETED: 100,
  RETAIN_FAILED: 500,
  CURSOR_MAX_LENGTH: 512,
} as const;
export const TTL = { CACHE: minutes(5), JOB_BACKOFF: seconds(1), SHUTDOWN: seconds(10) } as const;
export const QUEUE_NAMES = {
  EMAIL: 'notification.email',
  SMS: 'notification.sms',
  WHATSAPP: 'notification.whatsapp',
  FCM: 'notification.fcm',
  INVOICE_GENERATE: 'invoice.generate',
  INVOICE_OVERDUE: 'invoice.overdue',
  LEASE_EXPIRY: 'lease.expiry-check',
  REPORT: 'report.generate',
  DOCUMENT: 'document.process',
  WEBHOOK: 'webhook.process',
} as const;
export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
export const CACHE_KEYS = {
  throttle: (ip: string, window: number): string => `rm:throttle:${ip}:${String(window)}`,
  organization: (id: string, key: string): string => `rm:org:${id}:${key}`,
};
export const HTTP_METHODS = { SAFE: ['GET', 'HEAD', 'OPTIONS'] } as const;
export const VALID_REQUEST_ID = /^[a-zA-Z0-9_-]{1,100}$/;
export const LOG_STATUS = { SERVER_ERROR: 500, CLIENT_ERROR: 400 } as const;
export const INTERNAL_MESSAGES = {
  STARTUP: 'Application startup failed',
  UNHANDLED: 'Unhandled process failure',
  TENANT_REQUIRED: 'Organization scope required',
  ROLLBACK_ONLY: 'Transaction marked rollback-only',
  INACTIVE: 'Infrastructure is not connected',
  JOB_UNSUPPORTED: 'No handler registered for this job',
  CONFIG: 'Invalid environment configuration',
} as const;

export const BOOLEAN_VALUES = ['true', 'false'] as const;
