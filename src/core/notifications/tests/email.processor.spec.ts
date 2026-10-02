import type { Job } from 'bullmq';
import { UnrecoverableError } from 'bullmq';
import type { EmailJob } from '../email-job.types';
import { EmailTemplateService } from '../email-template.service';
import { EmailProcessor } from '../email.processor';
import { maskEmail } from '../../../shared/mask';
import { FakeEmailProvider } from '../../../integrations/email/tests/fake-email.provider';

describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let fakeProvider: FakeEmailProvider;
  let templateService: EmailTemplateService;

  beforeEach(() => {
    fakeProvider = new FakeEmailProvider();
    templateService = new EmailTemplateService();
    processor = new EmailProcessor(fakeProvider, templateService);
  });

  it('renders template, sends email, and logs masked recipient on success', async () => {
    const job = {
      id: 'job-1',
      queueName: 'notification.email',
      attemptsMade: 0,
      data: {
        template: 'otp',
        to: 'alice@example.com',
        data: {
          code: '123456',
          purpose: 'LOGIN',
          expiresInMinutes: 5,
        },
      },
    } as unknown as Job<EmailJob>;

    await processor.process(job);

    expect(fakeProvider.outbox).toHaveLength(1);
    expect(fakeProvider.outbox[0]?.to).toBe('alice@example.com');
    expect(fakeProvider.outbox[0]?.subject).toContain('Login Code');
  });

  it('rethrows retryable delivery errors for BullMQ retry backoff', async () => {
    fakeProvider.shouldFailRetryable = true;

    const job = {
      id: 'job-2',
      queueName: 'notification.email',
      attemptsMade: 0,
      data: {
        template: 'otp',
        to: 'bob@example.com',
        data: {
          code: '123456',
          purpose: 'LOGIN',
          expiresInMinutes: 5,
        },
      },
    } as unknown as Job<EmailJob>;

    await expect(processor.process(job)).rejects.toThrow('Fake provider error');
  });

  it('converts non-retryable delivery errors into UnrecoverableError', async () => {
    fakeProvider.shouldFailNonRetryable = true;

    const job = {
      id: 'job-3',
      queueName: 'notification.email',
      attemptsMade: 0,
      data: {
        template: 'otp',
        to: 'charlie@example.com',
        data: {
          code: '123456',
          purpose: 'LOGIN',
          expiresInMinutes: 5,
        },
      },
    } as unknown as Job<EmailJob>;

    await expect(processor.process(job)).rejects.toThrow(UnrecoverableError);
  });

  it('masks email addresses correctly', () => {
    expect(maskEmail('aakash@domain.com')).toBe('a***h@domain.com');
    expect(maskEmail('john.doe@company.org')).toBe('j***e@company.org');
    expect(maskEmail('invalid-email')).toBe('***');
  });
});
