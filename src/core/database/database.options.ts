import { join, relative, resolve } from 'node:path';
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
    entities: [toGlob(join(__dirname, '..', '..', 'modules', '**', '*.entity.{ts,js}'))],
    migrations: [toGlob(join(__dirname, 'migrations', '*.{ts,js}'))],
    migrationsTableName: 'typeorm_migrations',
    logging: input.nodeEnv === 'development' ? ['error', 'warn'] : ['error'],
  };
}

function toGlob(target: string): string {
  // Absolute Windows globs make tinyglobby emit a drive-letter segment. path.resolve then
  // prefixes the cwd and produces D:\d:\... (or d:\D:\...), which Node cannot require.
  // A cwd-relative pattern stays valid for Nest, the TypeORM CLI, and Jest.
  const from = normalizeDrive(resolve(process.cwd()));
  const to = normalizeDrive(resolve(target));
  return relative(from, to).replace(/\\/g, '/');
}

function normalizeDrive(filePath: string): string {
  return filePath.replace(/^([A-Za-z]):/, (_, drive: string) => `${drive.toLowerCase()}:`);
}
