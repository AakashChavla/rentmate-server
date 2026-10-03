import { describe, expect, it } from 'vitest';
import { parseEnvironment } from './environment';

const valid = {
  CLIENT_ORIGIN: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/rentmate',
  REDIS_URL: 'redis://localhost:6379',
};

describe('environment validation', () => {
  it('coerces a configured port and supplies safe defaults', () => {
    expect(parseEnvironment({ ...valid, PORT: '3002' })).toMatchObject({
      PORT: 3002,
      NODE_ENV: 'development',
    });
  });

  it.each([{ PORT: '0' }, { DATABASE_URL: 'https://localhost' }, { REDIS_URL: '' }])(
    'rejects invalid infrastructure configuration',
    (override) => {
      expect(() => parseEnvironment({ ...valid, ...override })).toThrow('Invalid environment');
    },
  );

  it('reports field names without leaking credentials', () => {
    expect(() => parseEnvironment({ ...valid, DATABASE_URL: 'sensitive-value' })).toThrow(
      'Invalid environment fields: DATABASE_URL',
    );
  });
});
