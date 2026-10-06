import type { PermissionContext } from '../../shared/identity.types';
import type { BedRecord, StatusInput } from '../../shared/unit.types';
export abstract class BedRepository {
  public abstract create(
    org: string,
    property: string,
    unit: string,
    label: string,
  ): Promise<BedRecord>;
  public abstract get(org: string, id: string): Promise<BedRecord | null>;
  public abstract lock(org: string, id: string): Promise<BedRecord | null>;
  public abstract list(org: string, unit: string): Promise<BedRecord[]>;
  public abstract update(org: string, id: string, label: string): Promise<void>;
  public abstract remove(org: string, id: string): Promise<void>;
  public abstract setStatus(org: string, id: string, status: BedRecord['status']): Promise<void>;
  public abstract counts(
    org: string,
    property: string,
  ): Promise<{ occupied: number; total: number }>;
}
export abstract class BedsService {
  public abstract create(actor: PermissionContext, unit: string, label: string): Promise<BedRecord>;
  public abstract list(actor: PermissionContext, unit: string): Promise<BedRecord[]>;
  public abstract get(actor: PermissionContext, id: string): Promise<BedRecord>;
  public abstract update(actor: PermissionContext, id: string, label: string): Promise<BedRecord>;
  public abstract remove(actor: PermissionContext, id: string): Promise<void>;
  public abstract status(
    actor: PermissionContext,
    id: string,
    input: StatusInput,
  ): Promise<BedRecord>;
}
