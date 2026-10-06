import type { DataSourceOptions } from 'typeorm';
import type { AppConfig } from '../config/app-config.contract';
import { SnakeNamingStrategy } from './snake-naming-strategy';
import { EnablePgcrypto1790985600000 } from './migrations/1790985600000-enable-pgcrypto';
import { join } from 'node:path';
export function databaseOptions(config: AppConfig): DataSourceOptions {
  return {
    type: 'postgres',
    host: config.get('DB_HOST'),
    port: config.get('DB_PORT'),
    username: config.get('DB_USER'),
    password: config.get('DB_PASSWORD'),
    database: config.get('DB_NAME'),
    ssl: config.get('DB_SSL') ? { rejectUnauthorized: true } : false,
    synchronize: false,
    migrationsRun: false,
    uuidExtension: 'pgcrypto',
    namingStrategy: new SnakeNamingStrategy(),
    entities: [join(__dirname, '../../modules/**/*.entity.{ts,js}')],
    migrations: [
      EnablePgcrypto1790985600000,
      join(__dirname, 'migrations/*-identity.{ts,js}'),
      join(__dirname, 'migrations/*-properties.{ts,js}'),
      join(__dirname, 'migrations/*-units.{ts,js}'),
    ],
    extra: {
      max: config.get('DB_POOL_MAX'),
      statement_timeout: config.get('DB_STATEMENT_TIMEOUT_MS'),
      connectionTimeoutMillis: config.get('DB_STATEMENT_TIMEOUT_MS'),
    },
  };
}
