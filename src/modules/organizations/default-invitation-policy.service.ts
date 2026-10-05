import { Inject, Injectable } from '@nestjs/common';
import { InvitationPolicy } from './invitation-policy.contract';
import { OrganizationPropertyDirectory } from './organization-property.contract';
import { PermissionChecker } from '../authorization';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { DOMAIN_PERMISSION as P } from '../../shared/property.constants';
import { ROLE, SCOPE } from '../../shared/identity.constants';
import type { PermissionContext } from '../../shared/identity.types';
import type { InviteRecord, InviteInput } from '../../shared/property.types';
@Injectable()
export class DefaultInvitationPolicy extends InvitationPolicy {
  public constructor(
    @Inject(OrganizationPropertyDirectory)
    private readonly properties: OrganizationPropertyDirectory,
    @Inject(PermissionChecker) private readonly permissions: PermissionChecker,
  ) {
    super();
  }
  public override async validate(actor: PermissionContext, input: InviteInput): Promise<string> {
    if (input.roleKey === ROLE.SUPER_ADMIN) throw new AppException(ErrorCode.FORBIDDEN);
    const scopeId = input.scopeId ?? actor.organization.id;
    if (input.scopeType === SCOPE.PROPERTY) {
      if (!input.scopeId || !(await this.properties.exists(actor.organization.id, scopeId)))
        throw new AppException(ErrorCode.NOT_FOUND);
    } else if (scopeId !== actor.organization.id) throw new AppException(ErrorCode.NOT_FOUND);
    this.permission(actor, input.scopeType, scopeId);
    if (input.roleKey === ROLE.OWNER && (input.scopeType !== SCOPE.ORGANIZATION || !isOwner(actor)))
      throw new AppException(ErrorCode.FORBIDDEN);
    return scopeId;
  }
  public override require(actor: PermissionContext, record: InviteRecord): void {
    this.permission(actor, record.scopeType, record.scopeId);
    if (record.roleId === ROLE.OWNER && !isOwner(actor))
      throw new AppException(ErrorCode.FORBIDDEN);
  }
  public override allowed(actor: PermissionContext): string[] | undefined {
    if (this.permissions.can(actor, P.INVITE)) return undefined;
    const ids = actor.roles
      .filter((r) => this.permissions.can(actor, P.INVITE, { propertyId: r.scopeId }))
      .map((r) => r.scopeId);
    if (!ids.length) throw new AppException(ErrorCode.FORBIDDEN);
    return ids;
  }
  private permission(actor: PermissionContext, scopeType: string, scopeId: string): void {
    if (
      !this.permissions.can(
        actor,
        P.INVITE,
        scopeType === SCOPE.PROPERTY ? { propertyId: scopeId } : {},
      )
    )
      throw new AppException(ErrorCode.FORBIDDEN);
  }
}
function isOwner(actor: PermissionContext): boolean {
  return actor.roles.some(
    (r) =>
      r.role === ROLE.OWNER &&
      r.scope === SCOPE.ORGANIZATION &&
      (!r.expiresAt || new Date(r.expiresAt) > new Date()),
  );
}
