import type { ScopeType } from '../types/scope-type';

export interface UserGrant {
  roleKey: string;
  scopeType: ScopeType;
  scopeId: string;
  permissions: string[];
  expiresAt: string | null;
}

export abstract class PermissionChecker {
  abstract getUserGrants(userId: string): Promise<UserGrant[]>;
  abstract invalidateUserCache(userId: string): Promise<void>;
}
