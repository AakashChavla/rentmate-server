import { TransactionRunner } from '../transaction-runner';
import type { DataSource, EntityManager, QueryRunner } from 'typeorm';

describe('TransactionRunner', () => {
  let runner: TransactionRunner;
  let mockQueryRunner: Partial<QueryRunner>;
  let mockManager: Partial<EntityManager>;
  let committed = false;
  let rolledBack = false;

  beforeEach(() => {
    committed = false;
    rolledBack = false;
    mockManager = {};
    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockImplementation(async () => {
        committed = true;
      }),
      rollbackTransaction: jest.fn().mockImplementation(async () => {
        rolledBack = true;
      }),
      release: jest.fn().mockResolvedValue(undefined),
      manager: mockManager as EntityManager,
    };

    const mockDataSource = {
      createQueryRunner: () => mockQueryRunner as QueryRunner,
    } as unknown as DataSource;

    runner = new TransactionRunner(mockDataSource);
  });

  it('commits transaction when operation succeeds', async () => {
    const result = await runner.run(async (manager) => {
      expect(TransactionRunner.getAmbientManager()).toBe(manager);
      return 'success';
    });

    expect(result).toBe('success');
    expect(committed).toBe(true);
    expect(rolledBack).toBe(false);
    expect(mockQueryRunner.release).toHaveBeenCalled();
  });

  it('rolls back transaction on mid-way failure', async () => {
    await expect(
      runner.run(async () => {
        throw new Error('Mid-way operation failure');
      }),
    ).rejects.toThrow('Mid-way operation failure');

    expect(committed).toBe(false);
    expect(rolledBack).toBe(true);
    expect(mockQueryRunner.release).toHaveBeenCalled();
  });

  it('joins outer transaction when nested', async () => {
    await runner.run(async (outerManager) => {
      await runner.run(async (innerManager) => {
        expect(innerManager).toBe(outerManager);
      });
    });

    expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1);
  });
});
