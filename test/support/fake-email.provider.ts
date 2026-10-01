import { EmailDeliveryError } from '../../src/integrations/email/email-delivery.error';
import {
  EmailMessage,
  EmailProvider,
  EmailSendResult,
} from '../../src/integrations/email/email.provider';

export class FakeEmailProvider extends EmailProvider {
  readonly outbox: EmailMessage[] = [];
  shouldFailRetryable = false;
  shouldFailNonRetryable = false;
  failMessage = 'Fake provider error';

  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (this.shouldFailNonRetryable) {
      throw new EmailDeliveryError(this.failMessage, false, 'FAKE_NON_RETRYABLE');
    }

    if (this.shouldFailRetryable) {
      throw new EmailDeliveryError(this.failMessage, true, 'FAKE_RETRYABLE');
    }

    this.outbox.push(message);
    return {
      providerMessageId: `fake-msg-${this.outbox.length}`,
    };
  }

  clear(): void {
    this.outbox.length = 0;
    this.shouldFailRetryable = false;
    this.shouldFailNonRetryable = false;
  }
}
