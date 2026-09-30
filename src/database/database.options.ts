import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from './snake-naming.strategy';

export function createDatabaseOptions(input: {
  databaseUrl: string;
  nodeEnv: string;
}): DataSourceOptions {
  return {
    type: 'postgres',
    url: input.databaseUrl,
    synchronize: false,
    migrationsRun: false,
    uuidExtension: 'pgcrypto',
    namingStrategy: new SnakeNamingStrategy(),
    entities: [toGlob(join(__dirname, '..', 'modules', '**', '*.entity.{ts,js}'))],
    migrations: [toGlob(join(__dirname, 'migrations', '*.{ts,js}'))],
    migrationsTableName: 'typeorm_migrations',
    logging: input.nodeEnv === 'development' ? ['error', 'warn'] : ['error'],
  };
}

function toGlob(path: string): string {
  return path.replace(/\\/g, '/');
}
