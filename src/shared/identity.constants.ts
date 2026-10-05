export const USER_STATUS = {
  PENDING: 'PENDING_VERIFICATION',
  INVITED: 'INVITED',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;
export const ROLE = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  OWNER: 'ORG_OWNER',
  MANAGER: 'PROPERTY_MANAGER',
  ACCOUNTANT: 'ACCOUNTANT',
  RECEPTIONIST: 'RECEPTIONIST',
  MAINTENANCE: 'MAINTENANCE_STAFF',
  SECURITY: 'SECURITY_STAFF',
  TENANT: 'TENANT',
} as const;
export const SCOPE = { ORGANIZATION: 'ORGANIZATION', PROPERTY: 'PROPERTY' } as const;
export const OTP_PURPOSE = {
  LOGIN: 'LOGIN',
  RESET: 'PASSWORD_RESET',
  VERIFY: 'EMAIL_VERIFICATION',
} as const;
export const IDENTITY_LIMITS = {
  CONTEXT_ATTEMPTS: 3,
  PASSWORD_MIN: 10,
  PASSWORD_MAX: 128,
  NAME_MAX: 200,
  PHONE_MAX: 30,
  OTP_DIGITS: 6,
  OTP_MIN: 0,
  OTP_MAX: 1_000_000,
  OTP_ATTEMPTS: 3,
  EMAIL_FAILURES: 5,
  LOGIN_FAILURES: 5,
  STRICT_THROTTLE: 10,
  SESSION_THROTTLE: 60,
  SECRET_MIN: 32,
  PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
  ARGON_MEMORY: 65536,
  ARGON_TIME: 3,
  ARGON_PARALLELISM: 1,
  TEST_ARGON_MEMORY: 4096,
  TEST_ARGON_TIME: 1,
} as const;
export const IDENTITY_TTL = {
  ACCESS: 900000,
  REFRESH: 2592000000,
  OTP: 300000,
  RESEND: 60000,
  LOCKOUT: 900000,
  EMAIL_WINDOW: 3600000,
  OTP_LOCK: 600000,
  GRACE: 10000,
  CONTEXT: 900000,
  REGISTRATION: 259200000,
  CLEANUP: 3600000,
  MILLISECONDS: 1000,
} as const;
export const AUTH_PATH = '/api/v1/auth';
export const IDENTITY_KEYS = {
  contextVersion: (org: string, id: string): string => `auth:context-version:${org}:${id}`,
  family: (id: string): string => `auth:revoked:fid:${id}`,
  user: (id: string): string => `auth:revoked:user:${id}`,
  context: (org: string, id: string): string => `auth:context:${org}:${id}`,
  login: (email: string, ip: string): string => `auth:login:${email}:${ip}`,
  loginLock: (email: string, ip: string): string => `auth:login:locked:${email}:${ip}`,
  otp: (id: string): string => `auth:otp:attempts:${id}`,
  resend: (email: string, purpose: string): string => `auth:otp:resend:${email}:${purpose}`,
  otpFailures: (email: string): string => `auth:otp:failures:${email}`,
  otpLock: (email: string): string => `auth:otp:locked:${email}`,
} as const;
export const SECURITY_EVENT = {
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILURE: 'auth.login.failure',
  LOGIN_LOCKED: 'auth.login.locked',
  REUSE: 'auth.refresh.reuse_detected',
  REVOKED: 'auth.session.revoked',
  CHANGED: 'auth.password.changed',
  RESET: 'auth.password.reset',
  OTP_SENT: 'auth.otp.sent',
  OTP_FAILED: 'auth.otp.failed',
  OTP_LOCKED: 'auth.otp.locked',
  REGISTERED: 'auth.register.created',
  VERIFIED: 'auth.register.verified',
  SUSPENDED: 'user.suspended',
  ASSIGNED: 'user.role_assigned',
  REMOVED: 'user.role_removed',
} as const;
export const JWT_IDENTITY = {
  ALGORITHM: 'HS256',
  ISSUER: 'rentmate',
  ACCESS_AUDIENCE: 'rentmate-api',
  REFRESH_AUDIENCE: 'rentmate-refresh',
} as const;
export const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d)[\s\S]{10,128}$/;
export const CONSENT = { TERMS: 'TERMS', PRIVACY: 'PRIVACY', VERSION: '2026-10-05' } as const;
export const ORGANIZATION_PLAN = {
  FREE: 'FREE',
  STANDARD: 'STANDARD',
  PREMIUM: 'PREMIUM',
} as const;
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const CLEANUP_JOB = 'registration.cleanup';
export const PERMISSION_RESOURCES = [
  'organization',
  'user',
  'role',
  'property',
  'unit',
  'tenant',
  'lease',
  'invoice',
  'payment',
  'expense',
  'complaint',
  'visitor',
  'notification',
  'report',
  'audit',
  'platform',
] as const;
export const PERMISSION_ACTIONS = ['read', 'create', 'update', 'delete', 'assign'] as const;
