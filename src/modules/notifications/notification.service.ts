import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { EmailJob } from '../../integrations/email/email-job';
import { QueueName } from '../../queues/queue.constants';

@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue(QueueName.NotificationEmail)
    private readonly emailQueue: Queue<EmailJob>,
  ) {}

  async sendEmail(job: EmailJob): Promise<void> {
    // For OTP jobs, removeOnComplete: true and removeOnFail: { age: 3600 } are specified
    // so plaintext OTP codes do not linger indefinitely in Redis after delivery.
    // Note: The worker process requires the plaintext code in the job payload to render the email body.
    await this.emailQueue.add('otp', job, {
      removeOnComplete: true,
      removeOnFail: { age: 3600 },
    });
  }
}
