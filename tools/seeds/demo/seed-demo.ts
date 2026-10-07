import type { DataSource, EntityManager } from 'typeorm';
import { AppConfigService } from '../../../src/core/config/default-app-config.service';
import { OrganizationEntity } from '../../../src/modules/organizations/organization.entity';
import { Argon2PasswordHasher } from '../../../src/integrations/password/adapters/argon2/argon2-password-hasher';
import { AesFieldEncryptor } from '../../../src/integrations/field-encryption/adapters/aes/aes-field-encryptor';
import { LocalFileStorage } from '../../../src/integrations/file-storage/adapters/local/local-file-storage';
import { NoneAntivirusScanner } from '../../../src/integrations/file-storage/adapters/none/none-antivirus-scanner';
import { SystemClock } from '../../../src/core/time/system-clock.service';
import { PASSWORD_POLICY } from '../../../src/shared/identity.constants';
import { seedStatements } from '../permissions';
import { DEMO } from './catalog';
import { demoId, type DemoContext } from './context';
import { seedAccounts } from './accounts';
import { seedProperties } from './properties';
import { seedUnits } from './units';
import { seedTenants } from './tenants';
import { seedLeases } from './leases';
import { seedInvitations } from './invitations';
import { invalidateDemo } from './cache';
export async function seedDemo(source: DataSource, password: string): Promise<void> {
  const config = new AppConfigService();
  if (
    !['development', 'test'].includes(config.get('NODE_ENV')) ||
    config.get('FILE_STORAGE') !== 'local'
  )
    throw new Error('Demo seeding requires a local development/test environment');
  if (!PASSWORD_POLICY.test(password))
    throw new Error('Configure a policy-compliant DEMO_SEED_PASSWORD');
  const storage = new LocalFileStorage(config, new SystemClock(), new NoneAntivirusScanner());
  const files: string[] = [],
    hash = await new Argon2PasswordHasher(config).hash(password);
  let context: DemoContext;
  try {
    context = await source.transaction((manager) =>
      seedTransaction(manager, { config, storage, files, passwordHash: hash }),
    );
  } catch (error) {
    await Promise.allSettled(files.map((key) => storage.remove(key)));
    throw error;
  }
  await invalidateDemo(context);
  process.stdout.write(
    'Demo ready: 8 role accounts, 4 properties, 33 units, 24 beds, 12 tenants, 12 private sample documents, 8 leases and 4 invitation states. No emails sent.\n',
  );
}
type Dependencies = Pick<DemoContext, 'config' | 'storage' | 'files' | 'passwordHash'>;
async function seedTransaction(
  manager: EntityManager,
  dependencies: Dependencies,
): Promise<DemoContext> {
  await manager.query('SELECT pg_advisory_xact_lock($1)', [DEMO.lock]);
  for (const statement of seedStatements())
    await manager.query(statement.query, statement.parameters);
  const repo = manager.getRepository(OrganizationEntity);
  const existing = await repo.findOneBy({ slug: DEMO.slug });
  if (existing && !existing.settings.demo && existing.name !== 'RentMate Demo')
    throw new Error('The demo slug belongs to a non-demo organization');
  const org =
    existing ??
    (await repo.save({
      id: demoId('organization'),
      slug: DEMO.slug,
      name: DEMO.name,
      isActive: true,
      timezone: 'Asia/Kolkata',
      defaultLocale: 'en',
      settings: { demo: true },
    }));
  const context: DemoContext = {
    ...dependencies,
    manager,
    orgId: org.id,
    cipher: new AesFieldEncryptor(dependencies.config),
    today: new Date(),
    users: new Map(),
    properties: new Map(),
    units: new Map(),
    tenants: [],
  };
  await seedProperties(context);
  await seedAccounts(context);
  await seedUnits(context);
  await seedTenants(context);
  await seedLeases(context);
  await seedInvitations(context);
  return context;
}
