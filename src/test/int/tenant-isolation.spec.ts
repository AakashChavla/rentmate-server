import 'reflect-metadata';
import { DataSource, type EntityManager } from 'typeorm';
import { AppConfigService } from '../../core/config/default-app-config.service';
import { databaseOptions } from '../../core/database/database-options';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import { TypeOrmTenantRepository } from '../../core/database/typeorm-tenant.repository';
import { TenantScopedRepository } from '../../core/database/tenant-scoped.repository';
import { UuidIdGenerator } from '../../core/ids/uuid-id-generator';
import { SampleEntity } from './sample.entity';
import { verifyIsolation } from './isolation-harness';

const source = new DataSource({
  ...databaseOptions(new AppConfigService()),
  entities: [SampleEntity],
});
class Connection extends DatabaseConnection {
  public override async connect(): Promise<void> {
    await source.initialize();
  }
  public override async close(): Promise<void> {
    await source.destroy();
  }
  public override async ready(): Promise<boolean> {
    await source.query('SELECT 1');
    return true;
  }
  public override async transaction<T>(action: () => Promise<T>): Promise<T> {
    return source.transaction(() => action());
  }
  public override withManager<T>(action: (manager: EntityManager) => Promise<T>): Promise<T> {
    return action(source.manager);
  }
}
class Repository extends TenantScopedRepository<SampleEntity> {
  public constructor() {
    super(new TypeOrmTenantRepository(new Connection(), SampleEntity, new UuidIdGenerator()));
  }
}
const repo = new Repository();
const orgA = '00000000-0000-4000-8000-000000000001';
const orgB = '00000000-0000-4000-8000-000000000002';
let id: string;
describe('PostgreSQL tenant isolation', () => {
  beforeAll(async () => {
    await source.initialize();
    await source.runMigrations();
    await source.query(
      'CREATE TABLE IF NOT EXISTS foundation_isolation_sample (id uuid PRIMARY KEY, organization_id uuid NOT NULL, name text NOT NULL, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), deleted_at timestamptz NULL)',
    );
    await source.query('TRUNCATE foundation_isolation_sample');
    id = await repo.insertInOrg(orgA, { name: 'original' });
  });
  afterAll(async () => {
    if (source.isInitialized) {
      await source.query('DROP TABLE IF EXISTS foundation_isolation_sample');
      await source.destroy();
    }
  });
  it('covers every inherited public method with real cross-org IO', async () => {
    await verifyIsolation(repo, {
      findByIdInOrg: async () => {
        expect(await repo.findByIdInOrg(orgB, id)).toBeNull();
        expect(await repo.findByIdInOrg(orgA, id)).not.toBeNull();
      },
      insertInOrg: async () => {
        const inserted = await repo.insertInOrg(orgA, {
          name: 'inserted',
          organizationId: orgB,
        } as unknown as { name: string });
        expect((await repo.findByIdInOrg(orgA, inserted))?.organizationId).toBe(orgA);
        expect(await repo.findByIdInOrg(orgB, inserted)).toBeNull();
      },
      updateInOrg: async () => {
        await expect(repo.updateInOrg(orgB, id, { name: 'stolen' })).rejects.toThrow();
        expect((await repo.findByIdInOrg(orgA, id))?.name).toBe('original');
        await repo.updateInOrg(orgA, id, { name: 'changed', organizationId: orgB } as unknown as {
          name: string;
        });
        expect((await repo.findByIdInOrg(orgA, id))?.name).toBe('changed');
        expect(await repo.findByIdInOrg(orgB, id)).toBeNull();
      },
    });
  });
});
