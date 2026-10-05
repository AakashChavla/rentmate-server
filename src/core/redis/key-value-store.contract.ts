export abstract class KeyValueStore {
  public abstract get(key: string): Promise<string | null>;
  public abstract set(key: string, value: string, ttlMs: number): Promise<void>;
  public abstract setIfCurrent(
    key: string,
    value: string,
    ttlMs: number,
    versionKey: string,
    expected: string,
    organizationVersion?: { key: string; value: string },
  ): Promise<boolean>;
  public abstract delete(key: string): Promise<void>;
  public abstract incrementWindow(key: string, ttlMs: number): Promise<number>;
  public abstract ping(): Promise<boolean>;
  public abstract connect(): Promise<void>;
  public abstract close(): Promise<void>;
}
