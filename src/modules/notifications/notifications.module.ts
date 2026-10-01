import { Module } from '@nestjs/common';
import { QueuesModule } from '../../queues/queues.module';
import { NotificationService } from './notifications.service';

@Module({
  imports: [QueuesModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
