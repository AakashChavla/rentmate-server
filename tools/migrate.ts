import source from '../src/core/database/data-source';
async function migrate(): Promise<void> {
  await source.initialize();
  try {
    await source.runMigrations();
  } finally {
    await source.destroy();
  }
}
void migrate().catch(() => {
  process.stderr.write('Migration failed; check database configuration/connectivity.\n');
  process.exitCode = 1;
});
