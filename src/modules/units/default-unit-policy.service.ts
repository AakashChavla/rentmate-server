import { Inject, Injectable } from '@nestjs/common';
import { UnitPolicy, FloorRepository } from './units.contract';
import { PropertyRepository } from '../properties';
import { PermissionChecker } from '../authorization';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { PROPERTY_STATUS } from '../../shared/property.constants';
import { UNIT_PERMISSION as P } from '../../shared/unit.constants';
import type { PermissionContext } from '../../shared/identity.types';
@Injectable()
export class DefaultUnitPolicy extends UnitPolicy {
  public constructor(
    @Inject(PropertyRepository) private readonly properties: PropertyRepository,
    @Inject(PermissionChecker) private readonly permissions: PermissionChecker,
    @Inject(FloorRepository) private readonly floors: FloorRepository,
  ) {
    super();
  }
  public override async property(
    actor: PermissionContext,
    id: string,
    permission: string,
  ): Promise<void> {
    const property = await this.properties.get(actor.organization.id, id);
    if (!property) throw new AppException(ErrorCode.NOT_FOUND);
    this.require(actor, permission, id);
    if (permission !== P.READ && property.status === PROPERTY_STATUS.ARCHIVED)
      throw new AppException(ErrorCode.UNIT_IN_USE);
  }
  public override require(actor: PermissionContext, permission: string, id: string): void {
    if (!this.permissions.can(actor, permission, { propertyId: id }))
      throw new AppException(ErrorCode.FORBIDDEN);
  }
  public override allowed(actor: PermissionContext, permission: string): string[] | undefined {
    if (this.permissions.can(actor, permission)) return undefined;
    return actor.roles
      .filter((role) => this.permissions.can(actor, permission, { propertyId: role.scopeId }))
      .map((role) => role.scopeId);
  }
  public override async floor(
    org: string,
    property: string,
    id: string | null | undefined,
  ): Promise<void> {
    if (!id) return;
    const floor = await this.floors.get(org, id);
    if (floor?.propertyId !== property) throw new AppException(ErrorCode.NOT_FOUND);
  }
}
