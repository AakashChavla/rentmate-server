import { z } from 'zod';

const durationPattern = /^\d+(ms|s|m|h|d|w)$/;

const optionalText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(1).optional(),
);

const optionalPort = z.preprocess(
  (value) => (value === undefined || value === '' ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

export const envSchema = z
  .object({
    NODE_ENV: z.preprocess(
      (value) => (value === undefined || value === '' ? undefined : value),
      z.enum(['development', 'test', 'production']).default('development'),
    ),
    PORT: z.preprocess(
      (value) => (value === undefined || value === '' ? undefined : value),
      z.coerce.number().int().positive().default(3000),
    ),
    DATABASE_URL: optionalText,
    DB_HOST: optionalText,
    DB_PORT: optionalPort,
    DB_USER: optionalText,
    DB_PASSWORD: optionalText,
    DB_NAME: optionalText,
    REDIS_URL: z.string().min(1),
    JWT_ACCESS_SECRET: z.string().min(16),
    JWT_REFRESH_SECRET: z.string().min(16),
    JWT_ACCESS_TTL: z.string().regex(durationPattern).default('15m'),
    JWT_REFRESH_TTL: z.string().regex(durationPattern).default('7d'),
    CORS_ORIGIN: z.string().min(1).default('http://localhost:3001'),
    COOKIE_DOMAIN: optionalText,
    PAYMENT_GATEWAY: z.string().min(1).default('razorpay'),
    RAZORPAY_KEY_ID: optionalText,
    RAZORPAY_KEY_SECRET: optionalText,
    RAZORPAY_WEBHOOK_SECRET: optionalText,
    S3_BUCKET: optionalText,
    S3_REGION: optionalText,
    SENDGRID_API_KEY: optionalText,
    AUTH_DEV_LOG_OTP: z.preprocess(
      (value) => (value === undefined || value === '' ? undefined : value),
      z
        .union([z.boolean(), z.enum(['true', 'false'])])
        .transform((value) => value === true || value === 'true')
        .default(false),
    ),
    SEED_SUPER_ADMIN_EMAIL: optionalText,
    SEED_SUPER_ADMIN_PASSWORD: optionalText,
    SEED_DEMO_PASSWORD: optionalText,
  })
  .superRefine((value, ctx) => {
    const hasDatabaseUrl = Boolean(value.DATABASE_URL);
    const hasDatabaseParts = Boolean(
      value.DB_HOST && value.DB_PORT && value.DB_USER && value.DB_PASSWORD && value.DB_NAME,
    );

    if (!hasDatabaseUrl && !hasDatabaseParts) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message:
          'Provide DATABASE_URL or all of DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME',
      });
    }

    if (value.DATABASE_URL && !isPostgresUrl(value.DATABASE_URL)) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL must use the postgres or postgresql protocol',
      });
    }

    if (!isRedisUrl(value.REDIS_URL)) {
      ctx.addIssue({
        code: 'custom',
        path: ['REDIS_URL'],
        message: 'REDIS_URL must use the redis or rediss protocol',
      });
    }

    if (value.JWT_ACCESS_SECRET === value.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_REFRESH_SECRET must be different from JWT_ACCESS_SECRET',
      });
    }

    if (value.NODE_ENV === 'production' && value.AUTH_DEV_LOG_OTP) {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_DEV_LOG_OTP'],
        message: 'AUTH_DEV_LOG_OTP cannot be enabled when NODE_ENV is production',
      });
    }
  });

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessTtl: string;
  jwtRefreshTtl: string;
  corsOrigins: string[];
  cookieDomain?: string;
  paymentGateway: string;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
  s3Bucket?: string;
  s3Region?: string;
  sendgridApiKey?: string;
  authDevLogOtp: boolean;
  seedSuperAdminEmail?: string;
  seedSuperAdminPassword?: string;
  seedDemoPassword?: string;
}

type ParsedEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown> | NodeJS.ProcessEnv): AppConfig {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return toAppConfig(parsed.data);
}

function toAppConfig(env: ParsedEnv): AppConfig {
  const databaseUrl = resolveDatabaseUrl(env);

  if (!isPostgresUrl(databaseUrl)) {
    throw new Error(
      'Invalid environment configuration:\nDATABASE_URL: must use the postgres or postgresql protocol',
    );
  }

  const config: AppConfig = {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    databaseUrl,
    redisUrl: env.REDIS_URL,
    jwtAccessSecret: env.JWT_ACCESS_SECRET,
    jwtRefreshSecret: env.JWT_REFRESH_SECRET,
    jwtAccessTtl: env.JWT_ACCESS_TTL,
    jwtRefreshTtl: env.JWT_REFRESH_TTL,
    corsOrigins: env.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    paymentGateway: env.PAYMENT_GATEWAY,
    authDevLogOtp: env.AUTH_DEV_LOG_OTP,
  };

  assignOptional(config, 'cookieDomain', env.COOKIE_DOMAIN);
  assignOptional(config, 'razorpayKeyId', env.RAZORPAY_KEY_ID);
  assignOptional(config, 'razorpayKeySecret', env.RAZORPAY_KEY_SECRET);
  assignOptional(config, 'razorpayWebhookSecret', env.RAZORPAY_WEBHOOK_SECRET);
  assignOptional(config, 's3Bucket', env.S3_BUCKET);
  assignOptional(config, 's3Region', env.S3_REGION);
  assignOptional(config, 'sendgridApiKey', env.SENDGRID_API_KEY);
  assignOptional(config, 'seedSuperAdminEmail', env.SEED_SUPER_ADMIN_EMAIL);
  assignOptional(config, 'seedSuperAdminPassword', env.SEED_SUPER_ADMIN_PASSWORD);
  assignOptional(config, 'seedDemoPassword', env.SEED_DEMO_PASSWORD);

  return config;
}

function assignOptional<K extends keyof AppConfig>(
  config: AppConfig,
  key: K,
  value: AppConfig[K] | undefined,
): void {
  if (value !== undefined) {
    config[key] = value;
  }
}

function resolveDatabaseUrl(env: ParsedEnv): string {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  const user = encodeURIComponent(env.DB_USER ?? '');
  const password = encodeURIComponent(env.DB_PASSWORD ?? '');
  return `postgresql://${user}:${password}@${env.DB_HOST ?? ''}:${env.DB_PORT ?? ''}/${env.DB_NAME ?? ''}`;
}

function isPostgresUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'postgres:' || url.protocol === 'postgresql:';
  } catch {
    return false;
  }
}

function isRedisUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'redis:' || url.protocol === 'rediss:';
  } catch {
    return false;
  }
}
