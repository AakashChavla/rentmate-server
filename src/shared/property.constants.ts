export const PROPERTY_TYPE = {
  HOTEL: 'HOTEL',
  PG: 'PG_HOSTEL',
  APARTMENT: 'APARTMENT_COMPLEX',
  FLAT: 'INDIVIDUAL_FLAT',
} as const;
export const PROPERTY_STATUS = { ACTIVE: 'ACTIVE', ARCHIVED: 'ARCHIVED' } as const;
export const PROPERTY_DEFAULTS = {
  CURRENCY: 'INR',
  COUNTRY: 'IN',
  CHECK_IN: '14:00',
  CHECK_OUT: '11:00',
  DUE_DAY: 1,
  GRACE_DAYS: 5,
} as const;
export const PROPERTY_LIMITS = {
  NAME: 200,
  ADDRESS: 300,
  CITY: 120,
  POSTAL: 20,
  COUNTRY: 2,
  TIMEZONE: 100,
  DAY: 28,
  GRACE: 31,
  PAGE: 25,
  CURSOR: 1000,
  SETTINGS: 65536,
} as const;
export const DOMAIN_PERMISSION = {
  ORG_READ: 'organization:read',
  ORG_UPDATE: 'organization:update',
  READ: 'property:read',
  CREATE: 'property:create',
  UPDATE: 'property:update',
  DELETE: 'property:delete',
  INVITE: 'user:invite',
} as const;
export const DOMAIN_EVENT = {
  CREATED: 'property.created',
  ARCHIVED: 'property.archived',
  ACCEPTED: 'invitation.accepted',
} as const;
export const INVITE_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED',
} as const;
export const INVITE_TTL = 604800000;
export const INVITE_TOKEN = {
  BYTES: 32,
  LENGTH: 64,
  DUMMY: '0'.repeat(64),
  PURPOSE: 'INVITATION',
} as const;
export const ONBOARDING_STEP = { EMAIL: 'verifyEmail', PROPERTY: 'create_first_property' } as const;
export const ORGANIZATION_VERSION = (org: string): string => 'auth:context:org-version:' + org;
