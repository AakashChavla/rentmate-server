import type { PermissionContext } from '../../shared/identity.types';
import type {
  DomainFilter,
  LeaseInput,
  LeaseRecord,
  LeaseView,
  LeaseStatus,
  LeaseChange,
} from '../../shared/lease.types';
import { JobHandler } from '../../core/queue/worker-host.contract';
export abstract class LeaseRepository {
  public abstract create(
    org: string,
    property: string,
    input: LeaseInput,
    renewedFrom?: string,
  ): Promise<LeaseRecord>;
  public abstract get(org: string, id: string): Promise<LeaseRecord | null>;
  public abstract lock(org: string, id: string): Promise<LeaseRecord | null>;
  public abstract list(
    org: string,
    filter: DomainFilter,
    allowed: string[] | undefined,
    user: string | undefined,
  ): Promise<{ items: LeaseRecord[]; nextCursor: string | null }>;
  public abstract overlap(org: string, input: LeaseInput, except?: string): Promise<boolean>;
  public abstract transition(
    org: string,
    id: string,
    status: LeaseStatus,
    fields: Partial<
      Pick<
        LeaseRecord,
        'terminatedAt' | 'terminateReason' | 'depositRecordedAt' | 'depositReference'
      >
    >,
  ): Promise<void>;
  public abstract members(org: string, id: string): Promise<string[]>;
  public abstract due(
    today: string,
    before: string,
  ): Promise<{ organizationId: string; id: string }[]>;
  public abstract occupied(org: string, unit: string, bed: string | null): Promise<boolean>;
}
export abstract class LeaseEffects {
  public abstract changed(change: LeaseChange): Promise<void>;
}
export abstract class LeasesService {
  public abstract create(actor: PermissionContext, input: LeaseInput): Promise<LeaseView>;
  public abstract get(actor: PermissionContext, id: string): Promise<LeaseView>;
  public abstract list(
    actor: PermissionContext,
    filter: DomainFilter,
  ): Promise<{ items: LeaseRecord[]; nextCursor: string | null }>;
  public abstract available(
    actor: PermissionContext,
    input: LeaseInput,
  ): Promise<{ available: boolean }>;
  public abstract deposit(
    actor: PermissionContext,
    id: string,
    reference: string,
  ): Promise<LeaseView>;
  public abstract renew(
    actor: PermissionContext,
    id: string,
    input: LeaseInput,
  ): Promise<LeaseView>;
  public abstract terminate(
    actor: PermissionContext,
    id: string,
    reason: string,
  ): Promise<LeaseView>;
  public abstract expiry(org: string, id: string, today: string): Promise<void>;
}
export abstract class LeaseExpiryJob extends JobHandler {}

export abstract class LeasePolicy {
  public abstract input(actor: PermissionContext, input: LeaseInput): Promise<string>;
  public abstract record(
    actor: PermissionContext,
    id: string,
    permission: string,
  ): Promise<LeaseRecord>;
  public abstract view(org: string, row: LeaseRecord): Promise<LeaseView>;
}
export abstract class LeaseLifecycle {
  public abstract deposit(
    actor: PermissionContext,
    id: string,
    reference: string,
  ): Promise<LeaseView>;
  public abstract renew(
    actor: PermissionContext,
    id: string,
    input: LeaseInput,
  ): Promise<LeaseView>;
  public abstract terminate(
    actor: PermissionContext,
    id: string,
    reason: string,
  ): Promise<LeaseView>;
  public abstract expiry(org: string, id: string, today: string): Promise<void>;
}
