export abstract class TenantInvitationLink {
  public abstract linkInvitation(
    org: string,
    email: string,
    property: string | null,
    user: string,
  ): Promise<void>;
}
