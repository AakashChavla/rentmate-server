import source from '../../../src/core/database/data-source';
import { seedDemo } from './seed-demo';
async function run(): Promise<void> {
  const password = process.env.DEMO_SEED_PASSWORD;
  if (!password) throw new Error('DEMO_SEED_PASSWORD is required; see docs/demo-accounts.md');
  await source.initialize();
  try {
    await seedDemo(source, password);
  } finally {
    await source.destroy();
  }
}
void run().catch(() => {
  process.stderr.write(
    'Demo seed failed. Check environment, migrations and demo configuration. Credentials were not printed.\n',
  );
  process.exitCode = 1;
});
