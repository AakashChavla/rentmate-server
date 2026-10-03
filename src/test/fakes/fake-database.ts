import type { EntityManager } from 'typeorm';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
export class FakeDatabase extends DatabaseConnection {
  public transactions = 0;
  public commits = 0;
  public rollbacks = 0;
  public available = true;
  public override async connect(): Promise<void> {
    await Promise.resolve();
  }
  public override async close(): Promise<void> {
    await Promise.resolve();
  }
  public override async ready(): Promise<boolean> {
    await Promise.resolve();
    return this.available;
  }
  public override async transaction<T>(action: () => Promise<T>): Promise<T> {
    await Promise.resolve();
    this.transactions += 1;
    try {
      const result = await action();
      this.commits += 1;
      return result;
    } catch (error) {
      this.rollbacks += 1;
      throw error;
    }
  }
  public override async withManager<T>(
    _action: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    await Promise.resolve();
    throw new Error('Fake database never exposes an ORM manager');
  }
}
