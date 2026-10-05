import { I18nService } from 'nestjs-i18n';
import { IdentityFixture } from '../e2e/identity-fixture';
import { LocalSmtpFixture } from './smtp-fixture';
import { QueuePublisher } from '../../core/queue/queue-publisher.contract';
import { AppConfigService } from '../../core/config/default-app-config.service';
import { UuidIdGenerator } from '../../core/ids/uuid-id-generator';
import { DefaultExternalCallPolicy } from '../../core/outbound/default-external-call-policy';
import { SmtpEmailProvider } from '../../integrations/email/adapters/smtp/smtp-email-provider';
import { WorkerHost } from '../../core/queue/worker-host.contract';
import { EmailJob } from '../../integrations/email/email-job.contract';
import { RegistrationCleanup } from '../../modules/auth/registration-cleanup.contract';
import { QUEUE_NAMES } from '../../core/config/config.constants';
import { CLEANUP_JOB, IDENTITY_TTL } from '../../shared/identity.constants';
class CapturedQueue extends QueuePublisher {
  public payload: Record<string, unknown> = {};
  public override publish(
    _queue: Parameters<QueuePublisher['publish']>[0],
    _id: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    this.payload = data;
    return Promise.resolve();
  }
  public override close(): Promise<void> {
    return Promise.resolve();
  }
}
const smtp = new LocalSmtpFixture();
const fixture = new IdentityFixture();
const queue = new CapturedQueue();
let mail: SmtpEmailProvider;
beforeAll(async () => {
  const port = await smtp.start();
  process.env.SMTP_HOST = '127.0.0.1';
  process.env.SMTP_PORT = String(port);
  await fixture.start();
  mail = new SmtpEmailProvider(
    new AppConfigService(),
    queue,
    new UuidIdGenerator(),
    fixture.app.get(I18nService),
    new DefaultExternalCallPolicy(),
  );
});
afterAll(async () => {
  await fixture.close();
  await smtp.close();
});
it('encrypts queued recipients/codes and delivers English and Hindi mail through real local SMTP', async () => {
  for (const locale of ['en', 'hi'] as const) {
    await mail.enqueue({
      recipient: 'recipient@fixture.rentmate.test',
      locale,
      purpose: 'PASSWORD_RESET',
      code: '123456',
    });
    expect(JSON.stringify(queue.payload)).not.toContain('recipient@fixture.rentmate.test');
    expect(JSON.stringify(queue.payload)).not.toContain('"code"');
    await mail.deliver(queue.payload);
  }
  expect(smtp.messages).toHaveLength(2);
  expect(smtp.messages[0]).toContain('123456');
  expect(smtp.messages[0]).toContain('password reset');
  expect(smtp.messages[1]).toContain('charset=utf-8');
});
it('rejects altered encrypted jobs and ignores expired codes before SMTP delivery', async () => {
  const count = smtp.messages.length;
  await expect(mail.deliver({ ...queue.payload, tag: '00'.repeat(16) })).rejects.toThrow();
  await mail.deliver({ ...queue.payload, expires: 0 });
  expect(smtp.messages).toHaveLength(count);
});
it('encrypts invitation URLs and delivers both locales with a seven-day queue lifetime', async () => {
  const before = smtp.messages.length;
  const url = 'http://localhost:3001/accept-invite?token=' + 'a'.repeat(64);
  for (const locale of ['en', 'hi'] as const) {
    const start = Date.now();
    await mail.enqueue({
      recipient: 'invite@fixture.rentmate.test',
      locale,
      purpose: 'INVITATION',
      inviteUrl: url,
      organizationName: 'Fixture organization',
    });
    expect(JSON.stringify(queue.payload)).not.toContain(url);
    expect(Number(queue.payload.expires) - start).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
    expect(Number(queue.payload.expires) - start).toBeLessThanOrEqual(
      7 * 24 * 60 * 60 * 1000 + 1000,
    );
    await mail.deliver(queue.payload);
  }
  expect(smtp.messages.length).toBe(before + 2);
  expect(smtp.messages.at(-2)).toContain('Fixture organization');
  expect(smtp.messages.at(-1)).toContain('charset=utf-8');
});
class SmtpJob extends EmailJob {
  public constructor(private readonly provider: SmtpEmailProvider) {
    super();
  }
  public override handle(_id: string, data: unknown): Promise<void> {
    return this.provider.deliver(data);
  }
}
it('delivers an encrypted email through the real BullMQ worker and creates the stable cleanup scheduler', async () => {
  const publisher = fixture.app.get(QueuePublisher);
  const provider = new SmtpEmailProvider(
    new AppConfigService(),
    publisher,
    new UuidIdGenerator(),
    fixture.app.get(I18nService),
    new DefaultExternalCallPolicy(),
  );
  const worker = fixture.app.get(WorkerHost);
  worker.register(QUEUE_NAMES.EMAIL, new SmtpJob(provider));
  worker.register(QUEUE_NAMES.REGISTRATION_CLEANUP, fixture.app.get(RegistrationCleanup));
  await publisher.schedule(QUEUE_NAMES.REGISTRATION_CLEANUP, CLEANUP_JOB, IDENTITY_TTL.CLEANUP);
  const before = smtp.messages.length;
  await provider.enqueue({
    recipient: 'worker@fixture.rentmate.test',
    locale: 'en',
    purpose: 'LOGIN',
    code: '654321',
  });
  const deadline = Date.now() + 5000;
  while (smtp.messages.length === before && Date.now() < deadline)
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 20);
    });
  expect(smtp.messages).toHaveLength(before + 1);
  expect(smtp.messages.at(-1)).toContain('654321');
});
