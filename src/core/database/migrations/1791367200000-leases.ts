import type { MigrationInterface, QueryRunner } from 'typeorm';
import schema from './leases-schema.json';
export class Leases1791367200000 implements MigrationInterface {
  public async up(runner: QueryRunner): Promise<void> {
    await runner.query('CREATE EXTENSION IF NOT EXISTS btree_gist');
    for (const statement of schema.up) await runner.query(statement.query, statement.parameters);
  }
  public async down(runner: QueryRunner): Promise<void> {
    for (const statement of schema.down) await runner.query(statement.query, statement.parameters);
  }
}
