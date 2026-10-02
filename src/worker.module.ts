import { Module } from '@nestjs/common';
import { AppConfigModule } from './core/config/config.module';
import { DatabaseModule } from './core/database/database.module';
import { AppLoggerModule } from './core/logger/logger.module';
import { NotificationsWorkerModule } from './core/notifications/notifications-worker.module';
import { QueuesModule } from './core/queue/queues.module';
import { RedisModule } from './core/redis/redis.module';

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule.forRoot(),
    RedisModule,
    DatabaseModule,
    QueuesModule,
    NotificationsWorkerModule,
  ],
})
export class WorkerModule {}
