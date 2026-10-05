import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { OrganizationService } from './organization-service.contract';
import { OrganizationRepository } from './organizations.contract';
import { PermissionChecker, PermissionContextLoader } from '../authorization';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import type { PermissionContext, OrganizationRecord } from '../../shared/identity.types';
import type { OrganizationPatch } from '../../shared/property.types';
import { DOMAIN_PERMISSION as P, PROPERTY_LIMITS as L } from '../../shared/property.constants';
@Injectable()
export class DefaultOrganizationService extends OrganizationService {
  public constructor(
    @Inject(OrganizationRepository) private readonly repo: OrganizationRepository,
    @Inject(PermissionChecker) private readonly permissions: PermissionChecker,
    @Inject(PermissionContextLoader) private readonly contexts: PermissionContextLoader,
  ) {
    super();
  }
  public override async get(actor: PermissionContext): Promise<OrganizationRecord> {
    this.require(actor, P.ORG_READ);
    const result = await this.repo.get(actor.organization.id);
    if (!result) throw new AppException(ErrorCode.NOT_FOUND);
    return result;
  }
  public override async update(
    actor: PermissionContext,
    patch: OrganizationPatch,
  ): Promise<OrganizationRecord> {
    this.require(actor, P.ORG_UPDATE);
    validate(patch);
    await this.repo.update(actor.organization.id, patch);
    await this.contexts.invalidateOrganization(actor.organization.id);
    const result = await this.repo.get(actor.organization.id);
    if (!result) throw new AppException(ErrorCode.NOT_FOUND);
    return result;
  }
  private require(actor: PermissionContext, permission: string): void {
    if (!this.permissions.can(actor, permission)) throw new AppException(ErrorCode.FORBIDDEN);
  }
}
function validate(patch: OrganizationPatch): void {
  if (!Object.values(patch).some((value) => value !== undefined))
    throw new AppException(ErrorCode.VALIDATION_ERROR);
  if (patch.timezone)
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: patch.timezone });
    } catch {
      throw new AppException(ErrorCode.VALIDATION_ERROR);
    }
  if (
    patch.settings &&
    (!z.record(z.string(), z.json()).safeParse(patch.settings).success ||
      JSON.stringify(patch.settings).length > L.SETTINGS)
  )
    throw new AppException(ErrorCode.VALIDATION_ERROR);
}
