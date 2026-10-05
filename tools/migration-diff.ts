import source from '../src/core/database/data-source';
import { existsSync, writeFileSync } from 'node:fs';
import { seedStatements } from './seeds/permissions';
const FILE = 'src/core/database/migrations/1791180000000-identity.ts';
async function migrationDiff(): Promise<void> {
  await source.initialize();
  try {
    const sql = await source.driver.createSchemaBuilder().log();
    if (process.argv.includes('--create')) {
      if (existsSync(FILE)) throw new Error('Identity migration already exists');
      const up = sql.upQueries.map(
        (q) =>
          `    await runner.query(${JSON.stringify(q.query)}, ${JSON.stringify(q.parameters ?? [])});`,
      );
      up.push(
        '    await runner.query("CREATE UNIQUE INDEX users_email_lower_unique ON users (lower(email))");',
      );
      const seed = seedStatements();
      const statements = JSON.stringify(seed);
      const body = `import type {MigrationInterface,QueryRunner} from 'typeorm';\nexport class Identity1791180000000 implements MigrationInterface {\n public async up(runner: QueryRunner): Promise<void> {\n${up.join('\n')}\n    for (const statement of SEED) await runner.query(statement.query,statement.parameters);\n }\n public async down(runner: QueryRunner): Promise<void> {\n${sql.downQueries.map((q) => `    await runner.query(${JSON.stringify(q.query)},${JSON.stringify(q.parameters ?? [])});`).join('\n')}\n }\n}\nconst SEED=${statements};\n`;
      writeFileSync(FILE, body);
      process.stdout.write('Created identity migration from entity metadata.\n');
      return;
    }
    if (sql.upQueries.length) {
      process.stderr.write(`Schema drift: ${String(sql.upQueries.length)} pending statements.\n`);
      process.exitCode = 1;
    } else process.stdout.write('EMPTY migration diff: database matches entity metadata.\n');
  } finally {
    await source.destroy();
  }
}
void migrationDiff().catch(() => {
  process.stderr.write('Migration schema check failed.\n');
  process.exitCode = 1;
});
