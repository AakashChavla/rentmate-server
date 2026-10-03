import type { EntityManager } from 'typeorm';
export abstract class DatabaseConnection {
  public abstract connect(): Promise<void>;
  public abstract ready(): Promise<boolean>;
  public abstract close(): Promise<void>;
  public abstract transaction<T>(action: () => Promise<T>): Promise<T>;
  public abstract withManager<T>(action: (manager: EntityManager) => Promise<T>): Promise<T>;
}
