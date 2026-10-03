import { WorkerHost } from './queue/worker-host.contract';
import { BullWorkerHost } from './queue/bull-worker-host';
import { InfrastructureLifecycle } from './lifecycle/infrastructure-lifecycle';
import { Global, Module } from '@nestjs/common';
import { AppConfig } from './config/app-config.contract';
import { AppConfigService } from './config/default-app-config.service';
import { Clock } from './time/clock.contract';
import { SystemClock } from './time/system-clock.service';
import { IdGenerator } from './ids/id-generator.contract';
import { UuidIdGenerator } from './ids/uuid-id-generator';
import { RequestContext } from './context/request-context';
import { TenantContext } from './tenancy/tenant-context';
import { KeyValueStore } from './redis/key-value-store.contract';
import { RedisKeyValueStore } from './redis/redis-key-value-store';
import { QueuePublisher } from './queue/queue-publisher.contract';
import { BullQueuePublisher } from './queue/bull-queue-publisher';
import { DatabaseConnection } from './database/database-connection.contract';
import { TypeOrmDatabaseConnection } from './database/typeorm-database-connection';
import { TransactionRunner } from './database/transaction-runner.contract';
import { DefaultTransactionRunner } from './database/default-transaction-runner';
import { EventBus } from './events/event-bus.contract';
import { DefaultEventBus } from './events/default-event-bus';
@Global()
@Module({
  providers: [
    { provide: WorkerHost, useClass: BullWorkerHost },
    InfrastructureLifecycle,
    { provide: AppConfig, useClass: AppConfigService },
    { provide: Clock, useClass: SystemClock },
    { provide: IdGenerator, useClass: UuidIdGenerator },
    RequestContext,
    TenantContext,
    { provide: KeyValueStore, useClass: RedisKeyValueStore },
    { provide: QueuePublisher, useClass: BullQueuePublisher },
    { provide: DatabaseConnection, useClass: TypeOrmDatabaseConnection },
    { provide: TransactionRunner, useClass: DefaultTransactionRunner },
    { provide: EventBus, useClass: DefaultEventBus },
  ],
  exports: [
    WorkerHost,
    AppConfig,
    Clock,
    IdGenerator,
    RequestContext,
    TenantContext,
    KeyValueStore,
    QueuePublisher,
    DatabaseConnection,
    TransactionRunner,
    EventBus,
  ],
})
export class CoreModule {}
