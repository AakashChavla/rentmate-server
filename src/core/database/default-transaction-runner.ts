import { Inject, Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { DatabaseConnection } from './database-connection.contract';
import { TransactionRunner } from './transaction-runner.contract';
import { INTERNAL_MESSAGES } from '../config/config.constants';
interface TransactionState {
  rollbackOnly: boolean;
}
@Injectable()
export class DefaultTransactionRunner extends TransactionRunner {
  private readonly ambient = new AsyncLocalStorage<TransactionState>();
  public constructor(@Inject(DatabaseConnection) private readonly database: DatabaseConnection) {
    super();
  }
  public override async run<T>(action: () => Promise<T>): Promise<T> {
    const current = this.ambient.getStore();
    if (current) {
      try {
        return await action();
      } catch (error) {
        current.rollbackOnly = true;
        throw error;
      }
    }
    return this.database.transaction(() =>
      this.ambient.run({ rollbackOnly: false }, async () => {
        const result = await action();
        if (this.ambient.getStore()?.rollbackOnly) throw new Error(INTERNAL_MESSAGES.ROLLBACK_ONLY);
        return result;
      }),
    );
  }
}
