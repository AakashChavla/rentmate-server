import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/config.module';
import { EmailProcessor } from './email.processor';
import { QueuesModule } from './queues.module';

@Module({
  imports: [AppConfigModule, QueuesModule],
  providers: [EmailProcessor],
})
export class EmailWorkerModule {}
