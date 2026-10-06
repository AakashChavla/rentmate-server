import type { PermissionContext } from '../../shared/identity.types';
import type { OccupancySnapshot } from '../../shared/unit.types';
export abstract class OccupancyStore {
  public abstract version(org: string, property: string): Promise<string>;
  public abstract get(org: string, property: string): Promise<OccupancySnapshot | null>;
  public abstract set(
    org: string,
    property: string,
    value: OccupancySnapshot,
    version: string,
  ): Promise<boolean>;
  public abstract invalidate(org: string, property: string): Promise<void>;
}
export abstract class OccupancyReadModel {
  public abstract get(actor: PermissionContext, property: string): Promise<OccupancySnapshot>;
}
