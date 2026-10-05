import type { PermissionContext, RoleAssignment } from '../../shared/identity.types';
export abstract class PermissionChecker {
  public abstract can(
    user: PermissionContext,
    permission: string,
    scope?: { propertyId?: string },
  ): boolean;
}
export abstract class PermissionContextLoader {
  public abstract load(org: string, user: string): Promise<PermissionContext>;
  public abstract invalidate(org: string, user: string): Promise<void>;
}
export abstract class PermissionContextStore {
  public abstract version(org: string, user: string): Promise<string>;
  public abstract get(org: string, user: string): Promise<PermissionContext | null>;
  public abstract set(
    org: string,
    user: string,
    context: PermissionContext,
    version: string,
  ): Promise<boolean>;
  public abstract invalidate(org: string, user: string): Promise<void>;
}
export abstract class RoleRepository {
  public abstract forUsers(org: string, users: string[]): Promise<RoleAssignment[]>;
  public abstract context(
    org: string,
    user: string,
  ): Promise<{ roles: RoleAssignment[]; permissions: string[] }>;
  public abstract assign(org: string, user: string, role: string): Promise<void>;
  public abstract remove(org: string, user: string, assignment: string): Promise<void>;
  public abstract lockOwners(org: string): Promise<string[]>;
  public abstract roles(): Promise<string[]>;
  public abstract permissions(): Promise<string[]>;
}
