import type { PermissionContext } from '../../shared/identity.types';
import type {
  FloorInput,
  FloorRecord,
  UnitInput,
  UnitPatch,
  UnitRecord,
  UnitFilter,
  UnitPage,
  UnitConfiguration,
  StatusInput,
  BulkPattern,
  UnitChange,
} from '../../shared/unit.types';
export abstract class FloorRepository {
  public abstract create(org: string, property: string, input: FloorInput): Promise<FloorRecord>;
  public abstract get(org: string, id: string): Promise<FloorRecord | null>;
  public abstract list(org: string, property: string): Promise<FloorRecord[]>;
  public abstract update(org: string, id: string, input: Partial<FloorInput>): Promise<void>;
  public abstract remove(org: string, id: string): Promise<void>;
  public abstract hasUnits(org: string, id: string): Promise<boolean>;
  public abstract ensure(
    org: string,
    property: string,
    level: number,
    wing: string,
  ): Promise<FloorRecord>;
}
export abstract class UnitRepository {
  public abstract lockProperty(org: string, property: string): Promise<void>;
  public abstract create(org: string, property: string, input: UnitInput): Promise<UnitRecord>;
  public abstract get(org: string, id: string): Promise<UnitRecord | null>;
  public abstract lock(org: string, id: string): Promise<UnitRecord | null>;
  public abstract list(
    org: string,
    filter: UnitFilter,
    allowed: string[] | undefined,
  ): Promise<UnitPage>;
  public abstract update(org: string, id: string, input: UnitPatch): Promise<void>;
  public abstract remove(org: string, id: string): Promise<void>;
  public abstract setStatus(org: string, id: string, status: UnitRecord['status']): Promise<void>;
  public abstract config(org: string, id: string): Promise<UnitConfiguration | null>;
  public abstract setConfig(
    org: string,
    property: string,
    id: string,
    config: UnitConfiguration,
  ): Promise<void>;
  public abstract bulk(org: string, property: string, rows: UnitInput[]): Promise<number>;
  public abstract counts(
    org: string,
    property: string,
  ): Promise<{ occupied: number; total: number }>;
  public abstract bedCount(org: string, id: string, activeOnly?: boolean): Promise<number>;
}
export abstract class UnitPolicy {
  public abstract property(actor: PermissionContext, id: string, permission: string): Promise<void>;
  public abstract require(actor: PermissionContext, permission: string, id: string): void;
  public abstract allowed(actor: PermissionContext, permission: string): string[] | undefined;
  public abstract floor(
    org: string,
    property: string,
    id: string | null | undefined,
  ): Promise<void>;
}
export abstract class UnitEffects {
  public abstract changed(change: UnitChange): Promise<void>;
}
export abstract class FloorsService {
  public abstract create(
    actor: PermissionContext,
    property: string,
    input: FloorInput,
  ): Promise<FloorRecord>;
  public abstract list(actor: PermissionContext, property: string): Promise<FloorRecord[]>;
  public abstract get(actor: PermissionContext, id: string): Promise<FloorRecord>;
  public abstract update(
    actor: PermissionContext,
    id: string,
    input: Partial<FloorInput>,
  ): Promise<FloorRecord>;
  public abstract remove(actor: PermissionContext, id: string): Promise<void>;
}
export abstract class UnitsService {
  public abstract create(
    actor: PermissionContext,
    property: string,
    input: UnitInput,
  ): Promise<UnitRecord>;
  public abstract list(actor: PermissionContext, filter: UnitFilter): Promise<UnitPage>;
  public abstract get(actor: PermissionContext, id: string): Promise<UnitRecord>;
  public abstract update(
    actor: PermissionContext,
    id: string,
    input: UnitPatch,
  ): Promise<UnitRecord>;
  public abstract remove(actor: PermissionContext, id: string): Promise<void>;
  public abstract status(
    actor: PermissionContext,
    id: string,
    input: StatusInput,
  ): Promise<UnitRecord>;
  public abstract config(actor: PermissionContext, id: string): Promise<UnitConfiguration>;
  public abstract setConfig(
    actor: PermissionContext,
    id: string,
    input: Partial<UnitConfiguration>,
  ): Promise<UnitConfiguration>;
}
export abstract class BulkUnitWriter {
  public abstract create(
    actor: PermissionContext,
    property: string,
    pattern: BulkPattern,
  ): Promise<number>;
}
