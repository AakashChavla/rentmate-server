import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AppLoggerModule } from './logger/logger.module';
import { QueuesModule } from './queues/queues.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [AppConfigModule, AppLoggerModule.forRoot(), RedisModule, DatabaseModule, QueuesModule],
})
export class WorkerModule {}
