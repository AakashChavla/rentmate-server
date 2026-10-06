import { JobHandler } from '../../core/queue/worker-host.contract';
import type { PermissionContext } from '../../shared/identity.types';
import type { BulkPattern, BulkRecord, BulkResult } from '../../shared/unit.types';
export abstract class BulkJobRepository {
  public abstract create(
    org: string,
    property: string,
    user: string,
    pattern: BulkPattern,
  ): Promise<BulkRecord>;
  public abstract get(org: string, id: string): Promise<BulkRecord | null>;
  public abstract lock(org: string, id: string): Promise<BulkRecord | null>;
  public abstract update(
    org: string,
    id: string,
    status: BulkRecord['status'],
    count: number,
    errorCode?: string,
  ): Promise<void>;
}
export abstract class BulkUnitsService {
  public abstract create(
    actor: PermissionContext,
    property: string,
    pattern: BulkPattern,
  ): Promise<BulkResult>;
  public abstract get(actor: PermissionContext, property: string, id: string): Promise<BulkRecord>;
}
export abstract class BulkUnitsJob extends JobHandler {}
