import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName } from '../queue/queue.constants';
import type { EmailJob, EmailTemplateDataMap, EmailTemplateKey } from './email-job.types';
import { EmailTemplateService } from './email-template.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue(QueueName.NotificationEmail)
    private readonly emailQueue: Queue<EmailJob>,
    private readonly templateService: EmailTemplateService,
  ) {}

  async sendEmail<K extends EmailTemplateKey>(
    to: string,
    template: K,
    data: EmailTemplateDataMap[K],
    locale?: string,
  ): Promise<void> {
    const jobData: EmailJob = {
      template,
      to,
      data,
      locale,
    } as EmailJob;

    const metadata = this.templateService.getTemplateMetadata(template);

    // Job name is the template key (e.g. 'otp')
    await this.emailQueue.add(template, jobData, {
      removeOnComplete: metadata.removeOnComplete,
      removeOnFail: metadata.removeOnFail,
    });
  }
}
