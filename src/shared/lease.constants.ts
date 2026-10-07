export const TENANT_STATUS = {
  PENDING: 'PENDING_KYC',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  INACTIVE: 'INACTIVE',
} as const;
export const DOCUMENT_TYPE = {
  AADHAAR: 'AADHAAR',
  PAN: 'PAN',
  PASSPORT: 'PASSPORT',
  PHOTO: 'PHOTO',
  OTHER: 'OTHER',
} as const;
export const DOCUMENT_STATUS = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const;
export const LEASE_STATUS = {
  PENDING: 'PENDING_DEPOSIT',
  ACTIVE: 'ACTIVE',
  EXPIRING: 'EXPIRING',
  EXPIRED: 'EXPIRED',
  RENEWED: 'RENEWED',
  TERMINATED: 'TERMINATED',
} as const;
export const LEASE_TERMINAL = [LEASE_STATUS.EXPIRED, LEASE_STATUS.TERMINATED] as readonly string[];
export const LEASE_LIMIT = {
  NAME: 200,
  PHONE: 30,
  REASON: 1000,
  PAGE: 50,
  MEMBERS: 20,
  EXPIRING_DAYS: 30,
  DAY_MS: 86400000,
  SCHEDULER_MS: 3600000,
  DUE_DAY: 28,
  ID_MIN: 4,
  ID_MAX: 100,
} as const;
export const LEASE_EVENT = {
  ACTIVATED: 'lease.activated',
  EXPIRED: 'lease.expired',
  TERMINATED: 'lease.terminated',
  RENEWED: 'lease.renewed',
} as const;
export const LEASE_JOB = 'lease.expiry-check';
export const LEASE_PERMISSION = {
  READ: 'lease:read',
  CREATE: 'lease:create',
  UPDATE: 'lease:update',
  DELETE: 'lease:delete',
} as const;
export const TENANT_PERMISSION = {
  READ: 'tenant:read',
  CREATE: 'tenant:create',
  UPDATE: 'tenant:update',
  DELETE: 'tenant:delete',
} as const;
export const FILE_LIMIT = {
  BYTES: 10485760,
  HEADER: 16,
  KEY_BYTES: 32,
  URL_TTL_MS: 120000,
  IV: 12,
  TAG: 16,
  KEY: 32,
  HEX_KEY: 64,
} as const;
export const FILE_MIME = { PDF: 'application/pdf', JPEG: 'image/jpeg', PNG: 'image/png' } as const;
export const STORAGE_KIND = { LOCAL: 'local', S3: 's3' } as const;
export const CRYPTO_FIELD = {
  ALGORITHM: 'aes-256-gcm',
  HASH: 'sha256',
  ENCODING: 'base64url',
  ID_DOMAIN: 'rentmate:id-number:',
  URL_DOMAIN: 'rentmate:private-file:',
  VERSION: 'v1',
} as const;
export const DATABASE_ERROR = { OVERLAP: '23P01' } as const;

export const FILE_MAGIC = {
  PDF: [37, 80, 68, 70, 45],
  PNG: [137, 80, 78, 71, 13, 10, 26, 10],
  JPEG: [255, 216, 255],
} as const;
export const STORAGE_LIMIT = {
  FILE_MODE: 0o600,
  DIRECTORY_MODE: 0o700,
  TIMEOUT_MS: 30000,
  SECOND_MS: 1000,
  DATE_LENGTH: 10,
} as const;

export const LEASE_SWEEP_LOCK = 1791367200;
