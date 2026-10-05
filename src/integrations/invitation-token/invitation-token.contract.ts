export abstract class InvitationToken {
  public abstract generate(): string;
  public abstract digest(token: string): string;
  public abstract matches(token: string, digest: string): boolean;
}
