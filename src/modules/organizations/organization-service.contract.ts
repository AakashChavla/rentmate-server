import type { OrganizationRecord, PermissionContext } from '../../shared/identity.types';
import type { OrganizationPatch } from '../../shared/property.types';
export abstract class OrganizationService {
  public abstract get(actor: PermissionContext): Promise<OrganizationRecord>;
  public abstract update(
    actor: PermissionContext,
    patch: OrganizationPatch,
  ): Promise<OrganizationRecord>;
}
