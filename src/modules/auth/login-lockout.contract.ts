export abstract class LoginLockout {
  public abstract check(email: string, ip: string): Promise<void>;
  public abstract failure(email: string, ip: string): Promise<void>;
  public abstract success(email: string, ip: string): Promise<void>;
}
