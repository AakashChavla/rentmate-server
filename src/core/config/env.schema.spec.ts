import { envSchema } from './env.schema';
const valid = { DB_PASSWORD: 'unit-fixture-only', REDIS_URL: 'redis://localhost:6379' };
describe('environment validation', () => {
  it('rejects invalid ports, booleans and missing infrastructure configuration', () => {
    expect(envSchema.safeParse({ ...valid, PORT: -1 }).success).toBe(false);
    expect(envSchema.safeParse({ ...valid, LOG_LEVEL: 'secret' }).success).toBe(false);
    expect(envSchema.safeParse({ ...valid, DB_SSL: 'invalid' }).success).toBe(false);
    expect(envSchema.safeParse({}).success).toBe(false);
    expect(envSchema.parse(valid).PORT).toBe(3000);
  });
  it('disables Swagger by default in production and validates origins', () => {
    expect(envSchema.parse({ ...valid, NODE_ENV: 'production' }).SWAGGER_ENABLED).toBe(false);
    expect(
      envSchema.parse({ ...valid, CORS_ORIGIN: 'http://localhost:3001,https://app.example.com' })
        .CORS_ORIGIN,
    ).toHaveLength(2);
    expect(envSchema.safeParse({ ...valid, CORS_ORIGIN: '*' }).success).toBe(false);
  });
});
