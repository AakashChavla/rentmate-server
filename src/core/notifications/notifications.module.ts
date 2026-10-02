import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueName } from '../queue/queue.constants';
import { EmailTemplateService } from './email-template.service';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QueueName.NotificationEmail,
    }),
  ],
  providers: [EmailTemplateService, NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
