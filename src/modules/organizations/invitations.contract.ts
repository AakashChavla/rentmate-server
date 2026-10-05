import type { PermissionContext } from '../../shared/identity.types';
import type { InviteRecord, InviteInput, InviteView } from '../../shared/property.types';
export interface InviteFilter {
  cursor?: string;
  scopeId?: string;
  status?: string;
}
export interface InvitePage {
  items: InviteView[];
  nextCursor: string | null;
}
export abstract class InvitationRepository {
  public abstract create(
    org: string,
    input: Omit<InviteRecord, 'id' | 'createdAt' | 'organizationId'>,
  ): Promise<InviteRecord>;
  public abstract get(org: string, id: string): Promise<InviteRecord | null>;
  public abstract lock(org: string, id: string): Promise<InviteRecord | null>;
  public abstract findByDigest(digest: string): Promise<InviteRecord | null>;
  public abstract pending(org: string, email: string, now: Date): Promise<boolean>;
  public abstract list(
    org: string,
    filter: InviteFilter,
    allowed: string[] | undefined,
  ): Promise<{ items: InviteRecord[]; nextCursor: string | null }>;
  public abstract rotate(
    org: string,
    id: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>;
  public abstract transition(org: string, id: string, from: string, to: string): Promise<boolean>;
}
export abstract class InvitationsService {
  public abstract create(actor: PermissionContext, input: InviteInput): Promise<InviteView>;
  public abstract list(actor: PermissionContext, filter: InviteFilter): Promise<InvitePage>;
  public abstract resend(actor: PermissionContext, id: string): Promise<InviteView>;
  public abstract revoke(actor: PermissionContext, id: string): Promise<void>;
  public abstract accept(
    token: string,
    fullName: string,
    password: string,
  ): Promise<{ accepted: boolean; roleKey: string; locale: string }>;
}
