import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { DatabaseConnection } from '../database/database-connection.contract';
import { KeyValueStore } from '../redis/key-value-store.contract';
import { QueuePublisher } from '../queue/queue-publisher.contract';
@Injectable()
export class InfrastructureLifecycle implements OnApplicationShutdown {
  public constructor(
    @Inject(DatabaseConnection) private readonly db: DatabaseConnection,
    @Inject(KeyValueStore) private readonly store: KeyValueStore,
    @Inject(QueuePublisher) private readonly queues: QueuePublisher,
  ) {}
  public async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled([this.queues.close(), this.store.close(), this.db.close()]);
  }
}
