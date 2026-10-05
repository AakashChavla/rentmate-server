import { Injectable, Inject } from '@nestjs/common';
import { EmailJob } from './email-job.contract';
import { EmailProvider } from './email-provider.contract';
@Injectable()
export class DefaultEmailJob extends EmailJob {
  public constructor(@Inject(EmailProvider) private readonly email: EmailProvider) {
    super();
  }
  public override handle(_jobId: string, data: unknown): Promise<void> {
    return this.email.deliver(data);
  }
}
