import { z } from 'zod';
import { CONFIG_DEFAULTS, ENVIRONMENT, LOG_LEVELS } from './config.constants';
export const envSchema = z.object({
  NODE_ENV: z
    .enum([ENVIRONMENT.DEVELOPMENT, ENVIRONMENT.TEST, ENVIRONMENT.PRODUCTION])
    .default(ENVIRONMENT.DEVELOPMENT),
  PORT: z.coerce
    .number()
    .int()
    .positive()
    .max(CONFIG_DEFAULTS.MAX_PORT)
    .default(CONFIG_DEFAULTS.PORT),
  LOG_LEVEL: z.enum(LOG_LEVELS).default(CONFIG_DEFAULTS.LOG_LEVEL),
});
export type AppEnvironment = z.infer<typeof envSchema>;
