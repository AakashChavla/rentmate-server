import { Processor } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { AppConfigService } from '../config/app-config.service';
import { BaseProcessor } from './base.processor';
import type { EmailJob } from './email-job';
import { QueueName } from './queue.constants';

@Processor(QueueName.NotificationEmail)
export class EmailProcessor extends BaseProcessor<EmailJob> {
  constructor(private readonly config: AppConfigService) {
    super();
  }

  protected handle(job: Job<EmailJob>): Promise<void> {
    if (this.config.authDevLogOtp && job.data.code) {
      this.logger.log(
        { to: job.data.to, purpose: job.data.purpose, otp: job.data.code },
        'Dev OTP email',
      );
      return Promise.resolve();
    }

    this.logger.log(
      { to: job.data.to, purpose: job.data.purpose, template: job.data.template },
      'Email delivery is not enabled yet',
    );
    return Promise.resolve();
  }
}
