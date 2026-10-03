import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  CLIENT_ORIGIN: z.url(),
  DATABASE_URL: z.url().refine((value) => /^postgres(ql)?:/.test(value)),
  REDIS_URL: z.url().refine((value) => /^rediss?:/.test(value)),
});

export function parseEnvironment(input: Record<string, unknown>) {
  const result = environmentSchema.safeParse(input);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.'));
    throw new Error('Invalid environment fields: ' + fields.join(', '));
  }
  return result.data;
}
