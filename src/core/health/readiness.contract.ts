export abstract class Readiness {
  public abstract check(): Promise<{ status: string; postgres: boolean; redis: boolean }>;
}
