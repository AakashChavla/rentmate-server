import type { MigrationInterface, QueryRunner } from 'typeorm';
import statements from './property-schema.json';
export class Properties1791194400000 implements MigrationInterface {
  public async up(runner: QueryRunner): Promise<void> {
    for (const query of statements.up) await runner.query(query.query, query.parameters);
    for (const seed of statements.seed) await runner.query(seed.query, seed.parameters);
  }
  public async down(runner: QueryRunner): Promise<void> {
    for (const query of statements.down) await runner.query(query.query, query.parameters);
  }
}
