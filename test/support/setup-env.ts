import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

process.env.NODE_ENV = 'test';
process.env.AUTH_DEV_LOG_OTP = 'false';
process.env.SEED_SUPER_ADMIN_EMAIL ??= 'super@rentmate.local';
process.env.SEED_SUPER_ADMIN_PASSWORD ??= 'SuperAdmin123';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-value';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-value';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.DATABASE_URL ??= 'postgresql://rentmate:rentmate@localhost:5432/rentmate';
