import type { OrganizationPatch } from '../../shared/property.types';
import { randomUUID } from 'node:crypto';
import { UserRepository } from '../../modules/users';
import { OrganizationRepository } from '../../modules/organizations';
import { RoleRepository, PermissionContextLoader } from '../../modules/authorization';
import type {
  IdentityUser,
  OrganizationRecord,
  RoleAssignment,
  PermissionContext,
  UserPatch,
} from '../../shared/identity.types';
import type { Locale } from '../../shared/locale.constants';
import { ROLE, SCOPE, USER_STATUS } from '../../shared/identity.constants';
import { FakeAuthRepository } from './fake-auth-repository';
export class FakeIdentityUsers extends UserRepository {
  public readonly users = new Map<string, IdentityUser>();
  public constructor(private readonly auth: FakeAuthRepository) {
    super();
  }
  public override findByIdInOrg(org: string, id: string): Promise<IdentityUser | null> {
    const user = this.users.get(id);
    return Promise.resolve(user?.organizationId === org ? user : null);
  }
  public override createInOrg(
    org: string,
    input: Parameters<UserRepository['createInOrg']>[1],
    hash: string,
  ): Promise<IdentityUser> {
    const user = {
      ...input,
      id: randomUUID(),
      organizationId: org,
      createdAt: new Date(),
      lastLoginAt: null,
      emailVerifiedAt: null,
    };
    this.users.set(user.id, user);
    this.auth.identities.set(user.email, { user, passwordHash: hash });
    return Promise.resolve(user);
  }
  public override recordLoginSuccess(org: string, id: string, time: Date): Promise<void> {
    this.require(org, id).lastLoginAt = time;
    return Promise.resolve();
  }
  public override setPasswordHash(org: string, id: string, hash: string): Promise<void> {
    const user = this.require(org, id);
    const identity = this.auth.identities.get(user.email);
    if (identity) identity.passwordHash = hash;
    return Promise.resolve();
  }
  public override updateProfile(org: string, id: string, patch: UserPatch): Promise<void> {
    Object.assign(this.require(org, id), patch);
    return Promise.resolve();
  }
  public override setStatus(
    org: string,
    id: string,
    status: IdentityUser['status'],
  ): Promise<void> {
    this.require(org, id).status = status;
    return Promise.resolve();
  }
  public override verifyEmail(org: string, id: string, time: Date): Promise<void> {
    Object.assign(this.require(org, id), { emailVerifiedAt: time, status: USER_STATUS.ACTIVE });
    return Promise.resolve();
  }
  public override listInOrg(
    org: string,
    _cursor: string | undefined,
    _status: string | undefined,
    _search: string | undefined,
  ): ReturnType<UserRepository['listInOrg']> {
    return Promise.resolve({
      items: [...this.users.values()].filter((user) => user.organizationId === org),
      nextCursor: null,
    });
  }
  private require(org: string, id: string): IdentityUser {
    const user = this.users.get(id);
    if (!user || user.organizationId !== org) throw new Error('Missing fixture user');
    return user;
  }
}
export class FakeIdentityOrganizations extends OrganizationRepository {
  public readonly organizations = new Map<string, OrganizationRecord>();
  public override update(id: string, patch: OrganizationPatch): Promise<void> {
    const org = this.organizations.get(id);
    if (org) Object.assign(org, patch);
    return Promise.resolve();
  }
  public override get(id: string): Promise<OrganizationRecord | null> {
    return Promise.resolve(this.organizations.get(id) ?? null);
  }
  public override create(
    name: string,
    slug: string,
    defaultLocale: Locale,
  ): Promise<OrganizationRecord> {
    const org = {
      id: randomUUID(),
      name,
      slug,
      defaultLocale,
      timezone: 'Asia/Kolkata',
      isActive: false,
    };
    this.organizations.set(org.id, org);
    return Promise.resolve(org);
  }
  public override activate(id: string): Promise<void> {
    const org = this.organizations.get(id);
    if (org) org.isActive = true;
    return Promise.resolve();
  }
}
export class FakeIdentityRoles extends RoleRepository {
  public readonly assignments: RoleAssignment[] = [];
  public override forUsers(org: string, users: string[]): Promise<RoleAssignment[]> {
    return Promise.resolve(
      this.assignments.filter((r) => r.organizationId === org && users.includes(r.userId)),
    );
  }
  public override context(org: string, user: string): ReturnType<RoleRepository['context']> {
    return Promise.resolve({
      roles: this.assignments.filter((r) => r.organizationId === org && r.userId === user),
      permissions: ['user:read', 'user:update', 'role:assign'],
    });
  }
  public override assign(org: string, user: string, role: string): Promise<void> {
    this.assignments.push({
      id: randomUUID(),
      organizationId: org,
      userId: user,
      role,
      scope: SCOPE.ORGANIZATION,
      scopeId: org,
      expiresAt: null,
      permissions: ['user:read', 'user:update', 'role:assign'],
    });
    return Promise.resolve();
  }
  public override remove(org: string, user: string, id: string): Promise<void> {
    const index = this.assignments.findIndex(
      (r) => r.organizationId === org && r.userId === user && r.id === id,
    );
    if (index >= 0) this.assignments.splice(index, 1);
    return Promise.resolve();
  }
  public override lockOwners(org: string): Promise<string[]> {
    return Promise.resolve(
      this.assignments
        .filter((r) => r.organizationId === org && r.role === ROLE.OWNER)
        .map((r) => r.userId),
    );
  }
  public override roles(): Promise<string[]> {
    return Promise.resolve(Object.values(ROLE));
  }
  public override permissions(): Promise<string[]> {
    return Promise.resolve(['user:read']);
  }
}
export class FakeIdentityContexts extends PermissionContextLoader {
  public invalidations = 0;
  public constructor(
    private readonly users: FakeIdentityUsers,
    private readonly organizations: FakeIdentityOrganizations,
    private readonly roles: FakeIdentityRoles,
  ) {
    super();
  }
  public override async load(org: string, id: string): Promise<PermissionContext> {
    const user = await this.users.findByIdInOrg(org, id);
    const organization = await this.organizations.get(org);
    if (!user || !organization) throw new Error('Fixture context missing');
    return {
      user,
      organization,
      ...(await this.roles.context(org, id)),
      isPlatformAdmin: false,
      onboarding: { steps: [] },
    };
  }
  public override invalidateOrganization(_org: string): Promise<void> {
    this.invalidations += 1;
    return Promise.resolve();
  }
  public override invalidate(_org: string, _user: string): Promise<void> {
    this.invalidations += 1;
    return Promise.resolve();
  }
}
