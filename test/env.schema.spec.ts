import { validateEnv } from '../src/config/env.schema';

const validEnv = {
  NODE_ENV: 'test',
  PORT: '3000',
  DATABASE_URL: 'postgresql://rentmate:rentmate@localhost:5432/rentmate',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'test-access-secret-value',
  JWT_REFRESH_SECRET: 'test-refresh-secret-value',
  CORS_ORIGIN: 'http://localhost:3001, http://localhost:3002',
};

describe('validateEnv', () => {
  it('returns typed config for a valid environment', () => {
    const config = validateEnv(validEnv);

    expect(config).toMatchObject({
      nodeEnv: 'test',
      port: 3000,
      databaseUrl: validEnv.DATABASE_URL,
      redisUrl: validEnv.REDIS_URL,
      corsOrigins: ['http://localhost:3001', 'http://localhost:3002'],
      jwtAccessTtl: '15m',
      jwtRefreshTtl: '7d',
      paymentGateway: 'razorpay',
    });
  });

  it('builds a database url from discrete variables', () => {
    const config = validateEnv({
      ...validEnv,
      DATABASE_URL: '',
      DB_HOST: 'db.internal',
      DB_PORT: '5432',
      DB_USER: 'rent mate',
      DB_PASSWORD: 'p@ss word',
      DB_NAME: 'rentmate',
    });

    expect(config.databaseUrl).toBe(
      'postgresql://rent%20mate:p%40ss%20word@db.internal:5432/rentmate',
    );
  });

  it('fails fast when required configuration is missing or invalid', () => {
    expect(() => validateEnv({ ...validEnv, REDIS_URL: '' })).toThrow(
      /Invalid environment configuration/,
    );
    expect(() =>
      validateEnv({ ...validEnv, DATABASE_URL: '', DB_HOST: '', DB_PORT: '', DB_USER: '' }),
    ).toThrow(/DATABASE_URL/);
    expect(() =>
      validateEnv({
        ...validEnv,
        JWT_ACCESS_SECRET: 'same-secret-value',
        JWT_REFRESH_SECRET: 'same-secret-value',
      }),
    ).toThrow(/JWT_REFRESH_SECRET/);
  });
});
