import { OrganizationPropertyDirectory } from '../organizations';
import { ONBOARDING_STEP as STEP } from '../../shared/property.constants';
import { Inject, Injectable } from '@nestjs/common';
import {
  PermissionContextLoader,
  PermissionContextStore,
  RoleRepository,
} from './permission.contract';
import { UserDirectory } from '../users';
import { OrganizationDirectory } from '../organizations';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { USER_STATUS, IDENTITY_LIMITS } from '../../shared/identity.constants';
import type { PermissionContext } from '../../shared/identity.types';
@Injectable()
export class DefaultPermissionContextLoader extends PermissionContextLoader {
  public constructor(
    @Inject(PermissionContextStore) private readonly cache: PermissionContextStore,
    @Inject(UserDirectory) private readonly users: UserDirectory,
    @Inject(OrganizationDirectory) private readonly organizations: OrganizationDirectory,
    @Inject(RoleRepository) private readonly roles: RoleRepository,
    @Inject(OrganizationPropertyDirectory)
    private readonly properties: OrganizationPropertyDirectory,
  ) {
    super();
  }
  public override async load(org: string, id: string): Promise<PermissionContext> {
    for (let attempt = 0; attempt < IDENTITY_LIMITS.CONTEXT_ATTEMPTS; attempt++) {
      const version = await this.cache.version(org, id);
      const cached = await this.cache.get(org, id);
      if (cached) return cached;
      const context = await this.loadFresh(org, id);
      if (await this.cache.set(org, id, context, version)) return context;
    }
    throw new AppException(ErrorCode.INFRASTRUCTURE_UNAVAILABLE);
  }
  private async loadFresh(org: string, id: string): Promise<PermissionContext> {
    const [user, organization, roles] = await Promise.all([
      this.users.findByIdInOrg(org, id),
      this.organizations.get(org),
      this.roles.context(org, id),
    ]);
    if (!user || !organization) throw new AppException(ErrorCode.UNAUTHORIZED);
    if (user.status === USER_STATUS.SUSPENDED) throw new AppException(ErrorCode.ACCOUNT_SUSPENDED);
    if (user.status !== USER_STATUS.ACTIVE || !organization.isActive)
      throw new AppException(ErrorCode.UNAUTHORIZED);
    const context = {
      user,
      organization,
      ...roles,
      isPlatformAdmin: user.isPlatformAdmin,
      onboarding: {
        steps: [
          { key: STEP.EMAIL, done: !!user.emailVerifiedAt },
          { key: STEP.PROPERTY, done: await this.properties.hasAny(org) },
        ],
      },
    };
    return context;
  }
  public override invalidateOrganization(org: string): Promise<void> {
    return this.cache.invalidateOrganization(org);
  }
  public override invalidate(org: string, id: string): Promise<void> {
    return this.cache.invalidate(org, id);
  }
}
