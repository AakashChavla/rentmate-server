import type { OrganizationPatch } from '../../shared/property.types';
import type { OrganizationRecord } from '../../shared/identity.types';
import type { Locale } from '../../shared/locale.constants';
export abstract class OrganizationDirectory {
  public abstract get(id: string): Promise<OrganizationRecord | null>;
}
export abstract class OrganizationRepository extends OrganizationDirectory {
  public abstract update(id: string, patch: OrganizationPatch): Promise<void>;
  public abstract create(name: string, slug: string, locale: Locale): Promise<OrganizationRecord>;
  public abstract activate(id: string): Promise<void>;
}
