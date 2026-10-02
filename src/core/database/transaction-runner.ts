import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

export interface TransactionContext {
  manager: EntityManager;
}

const transactionStorage = new AsyncLocalStorage<TransactionContext>();

@Injectable()
export class TransactionRunner {
  constructor(private readonly dataSource: DataSource) {}

  static getAmbientManager(): EntityManager | null {
    const store = transactionStorage.getStore();
    return store ? store.manager : null;
  }

  async run<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    const currentManager = TransactionRunner.getAmbientManager();
    if (currentManager) {
      // Join ambient transaction
      return work(currentManager);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await transactionStorage.run({ manager: queryRunner.manager }, async () => {
        return await work(queryRunner.manager);
      });
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
