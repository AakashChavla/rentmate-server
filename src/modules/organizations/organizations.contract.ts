import type { OrganizationRecord } from '../../shared/identity.types';
import type { Locale } from '../../shared/locale.constants';
export abstract class OrganizationDirectory {
  public abstract get(id: string): Promise<OrganizationRecord | null>;
}
export abstract class OrganizationRepository extends OrganizationDirectory {
  public abstract create(name: string, slug: string, locale: Locale): Promise<OrganizationRecord>;
  public abstract activate(id: string): Promise<void>;
}
