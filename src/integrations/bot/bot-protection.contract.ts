export abstract class BotProtection {
  public abstract check(ip: string): Promise<void>;
}
