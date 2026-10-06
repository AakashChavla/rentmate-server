import type { DatabaseConnection } from '../../core/database/database-connection.contract';
export async function countQueries<T>(
  db: DatabaseConnection,
  action: () => Promise<T>,
): Promise<{ result: T; count: number }> {
  return db.withManager(async (manager) => {
    const logger = manager.dataSource.logger;
    const original = logger.logQuery.bind(logger);
    let count = 0;
    logger.logQuery = (...args) => {
      count++;
      original(...args);
    };
    try {
      return { result: await action(), count };
    } finally {
      logger.logQuery = original;
    }
  });
}
