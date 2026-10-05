process.env.DB_PASSWORD ??= 'unit-fixture-only';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.LOG_LEVEL = 'silent';
const crypto = require('node:crypto');
for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'OTP_HMAC_SECRET'])
  process.env[key] = crypto.randomBytes(32).toString('hex');
