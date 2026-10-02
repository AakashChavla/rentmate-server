import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.schema';
import { createDatabaseOptions } from './database.options';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const env = validateEnv(process.env);

export const AppDataSource = new DataSource(
  createDatabaseOptions({
    databaseUrl: env.databaseUrl,
    nodeEnv: env.nodeEnv,
  }),
);
