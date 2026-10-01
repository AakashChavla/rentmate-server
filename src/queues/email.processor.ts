import { Processor } from '@nestjs/bullmq';
import { UnrecoverableError, type Job } from 'bullmq';
import { EmailDeliveryError } from '../integrations/email/email-delivery.error';
import type { EmailJob } from '../integrations/email/email-job';
import { EmailProvider } from '../integrations/email/email.provider';
import { EmailTemplateService } from '../integrations/email/templates/email-template.service';
import { BaseProcessor } from './base.processor';
import { QueueName } from './queue.constants';

@Processor(QueueName.NotificationEmail, { concurrency: 2 })
export class EmailProcessor extends BaseProcessor<EmailJob> {
  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly templateService: EmailTemplateService,
  ) {
    super();
  }

  protected async handle(job: Job<EmailJob>): Promise<void> {
    const rendered = this.templateService.render(job.data);

    try {
      const result = await this.emailProvider.send({
        to: job.data.to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });

      this.logger.log(
        {
          to: maskEmail(job.data.to),
          template: job.data.template,
          providerMessageId: result.providerMessageId,
        },
        'Email delivered successfully',
      );
    } catch (error) {
      if (error instanceof EmailDeliveryError && !error.retryable) {
        this.logger.error(
          {
            to: maskEmail(job.data.to),
            template: job.data.template,
            reason: error.reason,
          },
          `Non-retryable email delivery error: ${error.message}`,
        );
        throw new UnrecoverableError(error.message);
      }

      throw error;
    }
  }
}

export function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) {
    return '***';
  }

  const [local, domain] = parts;
  const firstChar = local && local.length > 0 ? local[0] : '';
  return `${firstChar}***@${domain}`;
}
