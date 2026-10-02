import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailModule } from '../../integrations/email/email.module';
import { QueueName } from '../queue/queue.constants';
import { EmailProcessor } from './email.processor';
import { EmailTemplateService } from './email-template.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QueueName.NotificationEmail,
    }),
    EmailModule,
  ],
  providers: [EmailProcessor, EmailTemplateService],
  exports: [EmailProcessor],
})
export class NotificationsWorkerModule {}
