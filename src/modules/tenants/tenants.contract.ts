import type { PermissionContext } from '../../shared/identity.types';
import type {
  TenantInput,
  TenantRecord,
  TenantView,
  DomainFilter,
  TenantStatus,
  DocumentRecord,
} from '../../shared/lease.types';
export abstract class KycDocumentDirectory {
  public abstract list(org: string, tenant: string): Promise<Pick<DocumentRecord, 'status'>[]>;
}
export interface TenantPage {
  items: TenantRecord[];
  nextCursor: string | null;
}
export abstract class TenantRepository {
  public abstract create(
    org: string,
    input: TenantInput & {
      idCipher: string | null;
      idHash: string | null;
      idLastFour: string | null;
    },
  ): Promise<TenantRecord>;
  public abstract get(org: string, id: string): Promise<TenantRecord | null>;
  public abstract lock(org: string, id: string): Promise<TenantRecord | null>;
  public abstract list(
    org: string,
    filter: DomainFilter,
    allowed: string[] | undefined,
    userId: string | undefined,
  ): Promise<TenantPage>;
  public abstract review(
    org: string,
    id: string,
    status: TenantStatus,
    reason: string | null,
  ): Promise<void>;
  public abstract update(
    org: string,
    id: string,
    input: Partial<Pick<TenantRecord, 'fullName' | 'phone' | 'emergencyContact'>>,
  ): Promise<void>;
  public abstract linkInvitation(
    org: string,
    email: string,
    property: string | null,
    user: string,
  ): Promise<void>;
}
export abstract class TenantPolicy {
  public abstract get(
    actor: PermissionContext,
    id: string,
    permission: string,
  ): Promise<TenantRecord>;
  public abstract property(actor: PermissionContext, id: string, permission: string): Promise<void>;
  public abstract ownOnly(actor: PermissionContext): boolean;
  public abstract allowed(actor: PermissionContext, permission: string): string[] | undefined;
}
export abstract class TenantsService {
  public abstract create(actor: PermissionContext, input: TenantInput): Promise<TenantView>;
  public abstract get(actor: PermissionContext, id: string): Promise<TenantView>;
  public abstract list(
    actor: PermissionContext,
    filter: DomainFilter,
  ): Promise<{ items: TenantView[]; nextCursor: string | null }>;
  public abstract update(
    actor: PermissionContext,
    id: string,
    input: Partial<Pick<TenantRecord, 'fullName' | 'phone' | 'emergencyContact'>>,
  ): Promise<TenantView>;
  public abstract review(
    actor: PermissionContext,
    id: string,
    status: TenantStatus,
    reason?: string,
  ): Promise<TenantView>;
  public abstract invite(actor: PermissionContext, id: string): Promise<void>;
}
