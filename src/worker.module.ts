import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AppLoggerModule } from './logger/logger.module';
import { EmailWorkerModule } from './queues/email-worker.module';
import { QueuesModule } from './queues/queues.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule.forRoot(),
    RedisModule,
    DatabaseModule,
    QueuesModule,
    EmailWorkerModule,
  ],
})
export class WorkerModule {}
