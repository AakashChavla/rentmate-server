import { STORAGE_KIND, FILE_LIMIT } from '../../shared/lease.constants';
import { z } from 'zod';
import { AUTH_ENV } from './auth-env.constants';
import { CONFIG_DEFAULTS as D, ENVIRONMENT, LOG_LEVELS, BOOLEAN_VALUES } from './config.constants';
import { ErrorCode } from '../errors/error-code.constants';
const booleanValue = z
  .union([z.boolean(), z.enum(BOOLEAN_VALUES)])
  .transform((value) => value === true || value === BOOLEAN_VALUES[0]);
const port = z.coerce.number().int().positive().max(D.MAX_PORT);
const secret = z
  .string()
  .min(AUTH_ENV.SECRET_MIN)
  .refine((value) => !/change.?me|placeholder|example|your[_-]|replace.?me/i.test(value));
const base = z.object({
  FIELD_KEY_ID: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .default('dev-v1'),
  FIELD_KEYS: z
    .string()
    .optional()
    .transform((value, context) => {
      if (!value) return undefined;
      try {
        return JSON.parse(value) as unknown;
      } catch {
        context.addIssue({ code: 'custom', message: ErrorCode.VALIDATION_ERROR });
        return z.NEVER;
      }
    })
    .pipe(z.record(z.string(), z.string().regex(/^[a-fA-F0-9]{64}$/)).optional()),
  FIELD_HASH_KEY: z
    .string()
    .length(FILE_LIMIT.HEX_KEY)
    .regex(/^[a-fA-F0-9]+$/)
    .optional(),
  FILE_STORAGE: z.enum([STORAGE_KIND.LOCAL, STORAGE_KIND.S3]).default(STORAGE_KIND.LOCAL),
  FILE_LOCAL_PATH: z.string().default('.rentmate-private/documents'),
  S3_REGION: z.string().default('ap-south-1'),
  S3_BUCKET: z.string().optional(),
  S3_ENDPOINT: z.preprocess((value) => value || undefined, z.url().optional()),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  JWT_ACCESS_SECRET: secret,
  JWT_REFRESH_SECRET: secret,
  OTP_HMAC_SECRET: secret,
  COOKIE_DOMAIN: z.string().optional(),
  SMTP_HOST: z
    .string()
    .regex(/^[a-zA-Z0-9._:-]+$/)
    .default('localhost'),
  SMTP_PORT: port.default(AUTH_ENV.SMTP_PORT),
  SMTP_SECURE: booleanValue.default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.email().default('noreply@rentmate.local'),
  NODE_ENV: z
    .enum([ENVIRONMENT.DEVELOPMENT, ENVIRONMENT.TEST, ENVIRONMENT.PRODUCTION])
    .default(ENVIRONMENT.DEVELOPMENT),
  PORT: port.default(D.PORT),
  LOG_LEVEL: z.enum(LOG_LEVELS).default(D.LOG_LEVEL),
  DB_HOST: z.string().min(1).default(D.DB_HOST),
  DB_PORT: port.default(D.DB_PORT),
  DB_NAME: z.string().min(1).default(D.DB_NAME),
  DB_USER: z.string().min(1).default(D.DB_USER),
  DB_PASSWORD: z.string().min(1),
  DB_SSL: booleanValue.default(false),
  DB_POOL_MAX: z.coerce.number().int().positive().default(D.DB_POOL_MAX),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(D.DB_STATEMENT_TIMEOUT_MS),
  REDIS_URL: z
    .url()
    .refine((value) => value.startsWith('redis://') || value.startsWith('rediss://')),
  CORS_ORIGIN: z
    .string()
    .default(D.CORS_ORIGIN)
    .transform((value) => value.split(',').map((origin) => origin.trim()))
    .pipe(z.array(z.url())),
  TRUST_PROXY: z.coerce.number().int().nonnegative().default(0),
  SWAGGER_ENABLED: booleanValue.optional(),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(D.THROTTLE_LIMIT),
  THROTTLE_WINDOW_MS: z.coerce.number().int().positive().default(D.THROTTLE_WINDOW_MS),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(D.WORKER_CONCURRENCY),
});
export const envSchema = base.transform((value) => ({
  ...value,
  SWAGGER_ENABLED: value.SWAGGER_ENABLED ?? value.NODE_ENV !== ENVIRONMENT.PRODUCTION,
}));
export type AppEnvironment = z.infer<typeof envSchema>;
