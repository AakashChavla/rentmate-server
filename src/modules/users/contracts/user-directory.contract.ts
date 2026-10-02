import type { UserStatus } from '../types/user-status';

export interface UserRecord {
  id: string;
  organizationId: string;
  email: string;
  passwordHash: string | null;
  fullName: string;
  phone: string | null;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export abstract class UserDirectory {
  abstract findByEmailForAuth(email: string): Promise<UserRecord | null>;
  abstract findById(organizationId: string, userId: string): Promise<UserRecord | null>;
  abstract updateLastLogin(organizationId: string, userId: string): Promise<void>;
}
