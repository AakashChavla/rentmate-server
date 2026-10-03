import { KeyValueStore } from '../../core/redis/key-value-store.contract';
export class FakeKeyValueStore extends KeyValueStore {
  private readonly values = new Map<string, { value: string; expires: number }>();
  public readonly counters = new Map<string, number>();
  public available = true;
  public override async connect(): Promise<void> {
    await Promise.resolve();
  }
  public override async close(): Promise<void> {
    await Promise.resolve();
  }
  public override async ping(): Promise<boolean> {
    await Promise.resolve();
    return this.available;
  }
  public override async get(key: string): Promise<string | null> {
    await Promise.resolve();
    const entry = this.values.get(key);
    return entry && entry.expires > Date.now() ? entry.value : null;
  }
  public override async set(key: string, value: string, ttlMs: number): Promise<void> {
    await Promise.resolve();
    this.values.set(key, { value, expires: Date.now() + ttlMs });
  }
  public override async delete(key: string): Promise<void> {
    await Promise.resolve();
    this.values.delete(key);
  }
  public override async incrementWindow(key: string, _ttlMs: number): Promise<number> {
    await Promise.resolve();

    const next = (this.counters.get(key) ?? 0) + 1;
    this.counters.set(key, next);
    return next;
  }
}
