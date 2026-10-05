export abstract class EmailPolicy {
  public abstract allowed(email: string): boolean;
}
