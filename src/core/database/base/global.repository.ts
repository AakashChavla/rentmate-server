import { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { TransactionRunner } from '../transaction-runner';

export abstract class GlobalRepository<T extends ObjectLiteral> {
  constructor(
    protected readonly target: EntityTarget<T>,
    protected readonly dataSource: DataSource,
  ) {}

  protected get repo(): Repository<T> {
    const ambientManager = TransactionRunner.getAmbientManager();
    if (ambientManager) {
      return ambientManager.getRepository(this.target);
    }
    return this.dataSource.getRepository(this.target);
  }
}
