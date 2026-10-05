import type { MigrationInterface, QueryRunner } from 'typeorm';
import schema from './identity-schema.json';
export class Identity1791180000000 implements MigrationInterface {
  public async up(runner: QueryRunner): Promise<void> {
    for (const statement of schema.up) await runner.query(statement.query, statement.parameters);
  }
  public async down(runner: QueryRunner): Promise<void> {
    for (const statement of schema.down) await runner.query(statement.query, statement.parameters);
  }
}
