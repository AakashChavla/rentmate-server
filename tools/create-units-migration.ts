import 'reflect-metadata';
import { existsSync, writeFileSync } from 'node:fs';
import source from '../src/core/database/data-source';
const FILE = 'src/core/database/migrations/1791280800000-units.ts';
async function create(): Promise<void> {
  if (process.env.NODE_ENV !== 'test' || process.env.DB_PORT !== '25432')
    throw new Error('An isolated Phase 4 test fixture is required');
  if (existsSync(FILE)) throw new Error('Units migration already exists');
  await source.initialize();
  try {
    const sql = await source.driver.createSchemaBuilder().log();
    if (!sql.upQueries.length) throw new Error('No unit schema changes');
    const schema = {
      up: uniqueEnums(sql.upQueries).map((q) => ({
        query: q.query,
        parameters: q.parameters ?? [],
      })),
      down: uniqueEnums(sql.downQueries)
        .sort(
          (a, b) => Number(a.query.startsWith(DROP_ENUM)) - Number(b.query.startsWith(DROP_ENUM)),
        )
        .map((q) => ({ query: q.query, parameters: q.parameters ?? [] })),
    };
    writeFileSync(
      'src/core/database/migrations/units-schema.json',
      JSON.stringify(schema, null, 2),
    );
    writeFileSync(
      FILE,
      `import type { MigrationInterface, QueryRunner } from 'typeorm';
import schema from './units-schema.json';
export class Units1791280800000 implements MigrationInterface {
  public async up(runner: QueryRunner): Promise<void> {
    for (const statement of schema.up) await runner.query(statement.query, statement.parameters);
  }
  public async down(runner: QueryRunner): Promise<void> {
    for (const statement of schema.down) await runner.query(statement.query, statement.parameters);
  }
}
`,
    );
    process.stdout.write('Created units migration from entity metadata.\n');
  } finally {
    await source.destroy();
  }
}
void create();
const DROP_ENUM = 'DROP TYPE';
function uniqueEnums<T extends { query: string }>(queries: T[]): T[] {
  const seen = new Set<string>();
  return queries.filter((query) => {
    if (!query.query.startsWith('CREATE TYPE') && !query.query.startsWith(DROP_ENUM)) return true;
    if (seen.has(query.query)) return false;
    seen.add(query.query);
    return true;
  });
}
