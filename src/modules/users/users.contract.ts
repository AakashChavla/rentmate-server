import type { IdentityUser, UserPatch } from '../../shared/identity.types';
export abstract class UserDirectory {
  public abstract findByIdInOrg(org: string, id: string): Promise<IdentityUser | null>;
}
export abstract class UserRepository extends UserDirectory {
  public abstract createInOrg(
    org: string,
    input: Omit<
      IdentityUser,
      'id' | 'createdAt' | 'lastLoginAt' | 'emailVerifiedAt' | 'organizationId'
    >,
    passwordHash: string,
  ): Promise<IdentityUser>;
  public abstract recordLoginSuccess(org: string, id: string, time: Date): Promise<void>;
  public abstract setPasswordHash(org: string, id: string, hash: string): Promise<void>;
  public abstract updateProfile(org: string, id: string, patch: UserPatch): Promise<void>;
  public abstract setStatus(org: string, id: string, status: IdentityUser['status']): Promise<void>;
  public abstract verifyEmail(org: string, id: string, time: Date): Promise<void>;
  public abstract listInOrg(
    org: string,
    cursor: string | undefined,
    status: string | undefined,
    search: string | undefined,
  ): Promise<{ items: IdentityUser[]; nextCursor: string | null }>;
}
export abstract class UsersService {
  public abstract get(org: string, id: string): Promise<IdentityUser>;
  public abstract list(
    org: string,
    cursor?: string,
    status?: string,
    search?: string,
  ): ReturnType<UserRepository['listInOrg']>;
  public abstract profile(org: string, id: string, patch: UserPatch): Promise<IdentityUser>;
  public abstract update(
    org: string,
    actor: string,
    id: string,
    patch: UserPatch,
  ): Promise<IdentityUser>;
  public abstract assign(
    org: string,
    actor: string,
    id: string,
    role: string,
    scope: string,
    scopeId?: string,
  ): Promise<void>;
  public abstract remove(org: string, actor: string, id: string, assignment: string): Promise<void>;
}
