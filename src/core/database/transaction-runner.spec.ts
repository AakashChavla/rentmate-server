import { DefaultTransactionRunner } from './default-transaction-runner';
import { FakeDatabase } from '../../test/fakes/fake-database';
describe('ambient transactions', () => {
  it('joins nested work into a single commit', async () => {
    const db = new FakeDatabase();
    const runner = new DefaultTransactionRunner(db);
    await runner.run(() => runner.run(() => Promise.resolve(42)));
    expect(db.transactions).toBe(1);
    expect(db.commits).toBe(1);
  });
  it('rolls back on failure and on a swallowed nested failure', async () => {
    const db = new FakeDatabase();
    const runner = new DefaultTransactionRunner(db);
    await expect(
      runner.run(async () => {
        try {
          await runner.run(() => Promise.reject(new Error('nested')));
        } catch {
          /* Caller swallows the failure; transaction still must roll back. */
        }
        return true;
      }),
    ).rejects.toThrow('rollback-only');
    expect(db.rollbacks).toBe(1);
  });
  it('does not share contexts across concurrent calls', async () => {
    const db = new FakeDatabase();
    const runner = new DefaultTransactionRunner(db);
    await Promise.all([runner.run(() => Promise.resolve(1)), runner.run(() => Promise.resolve(2))]);
    expect(db.transactions).toBe(2);
  });
});
