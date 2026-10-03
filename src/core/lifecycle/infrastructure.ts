import type { INestApplicationContext } from '@nestjs/common';
import { DatabaseConnection } from '../database/database-connection.contract';
import { KeyValueStore } from '../redis/key-value-store.contract';
import { QueuePublisher } from '../queue/queue-publisher.contract';
export async function connectInfrastructure(app: INestApplicationContext): Promise<void> {
  await Promise.all([app.get(DatabaseConnection).connect(), app.get(KeyValueStore).connect()]);
}
export async function closeInfrastructure(app: INestApplicationContext): Promise<void> {
  await Promise.allSettled([
    app.get(QueuePublisher).close(),
    app.get(KeyValueStore).close(),
    app.get(DatabaseConnection).close(),
  ]);
}
