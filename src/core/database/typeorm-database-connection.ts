import { Inject, Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { DataSource, type EntityManager } from 'typeorm';
import { AppConfig } from '../config/app-config.contract';
import { databaseOptions } from './database-options';
import { DatabaseConnection } from './database-connection.contract';
@Injectable()
export class TypeOrmDatabaseConnection extends DatabaseConnection {
  private readonly source: DataSource;
  private readonly ambient = new AsyncLocalStorage<EntityManager>();
  public constructor(@Inject(AppConfig) config: AppConfig) {
    super();
    this.source = new DataSource(databaseOptions(config));
  }
  public override async connect(): Promise<void> {
    if (!this.source.isInitialized) await this.source.initialize();
  }
  public override async ready(): Promise<boolean> {
    if (!this.source.isInitialized) return false;
    await this.source.query('SELECT 1');
    return true;
  }
  public override async close(): Promise<void> {
    if (this.source.isInitialized) await this.source.destroy();
  }
  public override async transaction<T>(action: () => Promise<T>): Promise<T> {
    return this.source.transaction((manager) => this.ambient.run(manager, action));
  }
  public override withManager<T>(action: (manager: EntityManager) => Promise<T>): Promise<T> {
    return action(this.ambient.getStore() ?? this.source.manager);
  }
}
