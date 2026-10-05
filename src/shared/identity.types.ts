import type { Locale } from './locale.constants';
import type { USER_STATUS, OTP_PURPOSE, SCOPE } from './identity.constants';
export interface IdentityUser {
  roles?: RoleAssignment[];
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  phone: string | null;
  locale: Locale;
  status: (typeof USER_STATUS)[keyof typeof USER_STATUS];
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  isPlatformAdmin: boolean;
  createdAt: Date;
}
export interface OrganizationRecord {
  settings?: Record<string, unknown>;
  id: string;
  name: string;
  slug: string;
  timezone: string;
  defaultLocale: Locale;
  isActive: boolean;
}
export interface RoleAssignment {
  permissions?: string[];
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  scope: (typeof SCOPE)[keyof typeof SCOPE];
  scopeId: string;
  expiresAt: Date | null;
}
export interface PermissionContext {
  user: IdentityUser;
  organization: OrganizationRecord;
  roles: RoleAssignment[];
  permissions: string[];
  isPlatformAdmin: boolean;
  onboarding: { steps: { key: string; done: boolean }[] };
}
export interface SessionClaims {
  sub: string;
  org: string;
  fid: string;
  jti?: string;
  iat: number;
}
export interface SessionTokens {
  access: string;
  refresh: string;
}
export interface RefreshRecord {
  id: string;
  organizationId: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  revokedAt: Date | null;
  replacedById: string | null;
  expiresAt: Date;
  ip: string;
  userAgent: string;
}
export interface OtpRecord {
  id: string;
  organizationId: string;
  userId: string;
  purpose: (typeof OTP_PURPOSE)[keyof typeof OTP_PURPOSE];
  codeHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
}
export interface RequestMetadata {
  ip: string;
  userAgent: string;
}
export interface RegistrationInput {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  organizationName: string;
  locale: Locale;
  acceptTerms: boolean;
  termsVersion: string;
}
export interface UserPatch {
  fullName?: string;
  phone?: string;
  locale?: Locale;
  status?: IdentityUser['status'];
}
