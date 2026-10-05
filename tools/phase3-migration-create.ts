import source from '../src/core/database/data-source';
import { existsSync, writeFileSync } from 'node:fs';
import { seedStatements } from './seeds/permissions';
const FILE = 'src/core/database/migrations/1791194400000-properties.ts';
async function create(): Promise<void> {
  if (existsSync(FILE)) throw new Error('Phase 3 migration already exists');
  await source.initialize();
  try {
    const schema = await source.driver.createSchemaBuilder().log();
    const statements = {
      up: schema.upQueries.map((query) => ({
        query: query.query,
        parameters: query.parameters ?? [],
      })),
      down: schema.downQueries.map((query) => ({
        query: query.query,
        parameters: query.parameters ?? [],
      })),
      seed: seedStatements(),
    };
    writeFileSync(
      'src/core/database/migrations/property-schema.json',
      JSON.stringify(statements, null, 2),
    );
    writeFileSync(
      FILE,
      "import type {MigrationInterface,QueryRunner} from 'typeorm';\nimport statements from './property-schema.json';\nexport class Properties1791194400000 implements MigrationInterface {\npublic async up(runner:QueryRunner):Promise<void>{for(const query of statements.up)await runner.query(query.query,query.parameters);for(const seed of statements.seed)await runner.query(seed.query,seed.parameters);}\npublic async down(runner:QueryRunner):Promise<void>{for(const query of statements.down)await runner.query(query.query,query.parameters);}\n}\n",
    );
    process.stdout.write('Created Phase 3 migration from metadata.\n');
  } finally {
    await source.destroy();
  }
}
void create().catch(() => {
  process.stderr.write('Phase 3 migration generation failed.\n');
  process.exitCode = 1;
});
