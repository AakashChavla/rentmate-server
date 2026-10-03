import { envSchema } from './env.schema';
describe('environment validation', () => {
  it('rejects invalid ports and log levels', () => {
    expect(envSchema.safeParse({ PORT: -1 }).success).toBe(false);
    expect(envSchema.safeParse({ LOG_LEVEL: 'secret' }).success).toBe(false);
    expect(envSchema.parse({}).PORT).toBe(3000);
  });
});
