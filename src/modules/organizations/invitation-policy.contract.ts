import type { PermissionContext } from '../../shared/identity.types';
import type { InviteInput, InviteRecord } from '../../shared/property.types';
export abstract class InvitationPolicy {
  public abstract validate(actor: PermissionContext, input: InviteInput): Promise<string>;
  public abstract require(actor: PermissionContext, record: InviteRecord): void;
  public abstract allowed(actor: PermissionContext): string[] | undefined;
}
