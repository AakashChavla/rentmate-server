import type { PROPERTY_TYPE, PROPERTY_STATUS, INVITE_STATUS } from './property.constants';
import type { SCOPE } from './identity.constants';
import type { Locale } from './locale.constants';
export type PropertyType = (typeof PROPERTY_TYPE)[keyof typeof PROPERTY_TYPE];
export type PropertyStatus = (typeof PROPERTY_STATUS)[keyof typeof PROPERTY_STATUS];
export interface PropertyRecord {
  id: string;
  organizationId: string;
  name: string;
  type: PropertyType;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  timezone: string | null;
  status: PropertyStatus;
  createdAt: Date;
}
export interface PropertyInput {
  name: string;
  type: PropertyType;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  timezone?: string;
  configuration?: PropertyConfiguration;
}
export interface PropertyConfiguration {
  currency: string;
  checkInTime?: string;
  checkOutTime?: string;
  rentDueDay?: number;
  graceDays?: number;
}
export type PropertyPatch = Partial<Omit<PropertyInput, 'type' | 'configuration' | 'timezone'>> & {
  timezone?: string | null;
  status?: PropertyStatus;
};
export interface PropertyFilter {
  propertyId?: string;
  cursor?: string;
  type?: PropertyType;
  status?: PropertyStatus;
  search?: string;
  mine?: boolean;
}
export interface PropertyPage {
  items: PropertyRecord[];
  nextCursor: string | null;
}
export interface OrganizationPatch {
  name?: string;
  timezone?: string;
  defaultLocale?: Locale;
  settings?: Record<string, unknown>;
}
export interface InviteInput {
  email: string;
  roleKey: string;
  scopeType: (typeof SCOPE)[keyof typeof SCOPE];
  scopeId?: string;
}
export interface InviteRecord {
  id: string;
  organizationId: string;
  email: string;
  roleId: string;
  scopeType: (typeof SCOPE)[keyof typeof SCOPE];
  scopeId: string;
  propertyId: string | null;
  tokenHash: string;
  status: (typeof INVITE_STATUS)[keyof typeof INVITE_STATUS];
  expiresAt: Date;
  invitedBy: string;
  locale: Locale;
  createdAt: Date;
}
export interface InviteView {
  id: string;
  email: string;
  roleKey: string;
  scopeType: string;
  scopeId: string;
  status: string;
  expiresAt: Date;
  locale: Locale;
  createdAt: Date;
}
