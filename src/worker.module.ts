import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { EmailModule } from './integrations/email/email.module';
import { AppLoggerModule } from './logger/logger.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
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
    EmailModule,
    NotificationsModule,
    EmailWorkerModule,
  ],
})
export class WorkerModule {}
