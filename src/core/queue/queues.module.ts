import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/app-config.service';
import { parseRedisUrl } from '../redis/parse-redis-url';
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from './queue.constants';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: {
          ...parseRedisUrl(config.redisUrl),
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue(
      ...QUEUE_NAMES.map((name) => ({
        name,
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      })),
    ),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
