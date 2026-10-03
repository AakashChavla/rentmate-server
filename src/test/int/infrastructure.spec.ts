import 'reflect-metadata';
import { AppConfigService } from '../../core/config/default-app-config.service';
import { RedisKeyValueStore } from '../../core/redis/redis-key-value-store';
import { TypeOrmDatabaseConnection } from '../../core/database/typeorm-database-connection';
import { DefaultTransactionRunner } from '../../core/database/default-transaction-runner';
import { DefaultReadiness } from '../../core/health/default-readiness.service';
import { randomUUID } from 'node:crypto';

const config = new AppConfigService();
const store = new RedisKeyValueStore(config);
const db = new TypeOrmDatabaseConnection(config);
describe('real infrastructure', () => {
  beforeAll(async () => {
    await Promise.all([store.connect(), db.connect()]);
  });
  afterAll(async () => {
    await Promise.allSettled([store.close(), db.close()]);
  });
  it('checks Postgres/Redis readiness and atomic Redis counters', async () => {
    expect(await new DefaultReadiness(db, store).check()).toEqual({
      status: 'ok',
      postgres: true,
      redis: true,
    });
    const key = 'fixture:' + randomUUID();
    try {
      const counts = await Promise.all(
        Array.from({ length: 20 }, () => store.incrementWindow(key, 60000)),
      );
      expect(new Set(counts).size).toBe(20);
      expect(Math.max(...counts)).toBe(20);
    } finally {
      await store.delete(key);
    }
  });
});
describe('real SQL transactions', () => {
  beforeAll(() => db.connect());
  afterAll(() => db.close());
  it('rolls back nested SQL work on the ambient manager', async () => {
    await db.withManager((manager) =>
      manager.query<unknown>(
        'CREATE TABLE IF NOT EXISTS foundation_transaction_sample (id uuid PRIMARY KEY)',
      ),
    );
    const id = randomUUID();
    const runner = new DefaultTransactionRunner(db);
    try {
      await expect(
        runner.run(async () => {
          await db.withManager((manager) =>
            manager.query<unknown>('INSERT INTO foundation_transaction_sample (id) VALUES ($1)', [
              id,
            ]),
          );
          await runner.run(() => Promise.reject(new Error('rollback')));
        }),
      ).rejects.toThrow('rollback');
      const rows: unknown = await db.withManager((manager) =>
        manager.query<unknown>('SELECT id FROM foundation_transaction_sample WHERE id=$1', [id]),
      );
      expect(rows).toEqual([]);
    } finally {
      await db.withManager((manager) =>
        manager.query<unknown>('DROP TABLE foundation_transaction_sample'),
      );
    }
  });
});
