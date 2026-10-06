import type { MigrationInterface, QueryRunner } from 'typeorm';
import schema from './units-schema.json';
export class Units1791280800000 implements MigrationInterface {
  public async up(runner: QueryRunner): Promise<void> {
    for (const statement of schema.up) await runner.query(statement.query, statement.parameters);
  }
  public async down(runner: QueryRunner): Promise<void> {
    for (const statement of schema.down) await runner.query(statement.query, statement.parameters);
  }
}
