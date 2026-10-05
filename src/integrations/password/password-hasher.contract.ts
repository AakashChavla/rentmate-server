export abstract class PasswordHasher {
  public abstract hash(password: string): Promise<string>;
  public abstract verify(hash: string, password: string): Promise<boolean>;
  public abstract dummyVerify(password: string): Promise<void>;
}
