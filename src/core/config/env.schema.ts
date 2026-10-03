import { z } from 'zod';
import { CONFIG_DEFAULTS as D, ENVIRONMENT, LOG_LEVELS, BOOLEAN_VALUES } from './config.constants';
const booleanValue = z
  .union([z.boolean(), z.enum(BOOLEAN_VALUES)])
  .transform((value) => value === true || value === BOOLEAN_VALUES[0]);
const port = z.coerce.number().int().positive().max(D.MAX_PORT);
const base = z.object({
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
