import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/config.module';
import { EmailModule } from '../integrations/email/email.module';
import { EmailProcessor } from './email.processor';
import { QueuesModule } from './queues.module';

@Module({
  imports: [AppConfigModule, QueuesModule, EmailModule],
  providers: [EmailProcessor],
})
export class EmailWorkerModule {}
