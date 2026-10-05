import { Inject, Injectable } from '@nestjs/common';
import { createTransport } from 'nodemailer';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { I18nService } from 'nestjs-i18n';
import { EmailProvider, type AuthEmail } from '../../email-provider.contract';
import { AppConfig } from '../../../../core/config/app-config.contract';
import { QueuePublisher } from '../../../../core/queue/queue-publisher.contract';
import { IdGenerator } from '../../../../core/ids/id-generator.contract';
import { QUEUE_NAMES } from '../../../../core/config/config.constants';
import { messageKey } from '../../../../shared/message-key';
import { ExternalCallPolicy } from '../../../../core/outbound/external-call-policy.contract';
import { EMAIL_CRYPTO } from './smtp.constants';
import { OTP_PURPOSE } from '../../../../shared/identity.constants';

interface SealedEmail {
  iv: string;
  tag: string;
  data: string;
  expires: number;
}
@Injectable()
export class SmtpEmailProvider extends EmailProvider {
  public constructor(
    @Inject(AppConfig) private readonly config: AppConfig,
    @Inject(QueuePublisher) private readonly queue: QueuePublisher,
    @Inject(IdGenerator) private readonly ids: IdGenerator,
    @Inject(I18nService) private readonly i18n: I18nService,
    @Inject(ExternalCallPolicy) private readonly calls: ExternalCallPolicy,
  ) {
    super();
  }
  private key(): Buffer {
    return createHash('sha256').update(this.config.get('OTP_HMAC_SECRET')).digest();
  }
  public override async enqueue(email: AuthEmail): Promise<void> {
    const iv = randomBytes(EMAIL_CRYPTO.IV_LENGTH);
    const cipher = createCipheriv(EMAIL_CRYPTO.ALGORITHM, this.key(), iv);
    const data = Buffer.concat([cipher.update(JSON.stringify(email)), cipher.final()]);
    await this.queue.publish(QUEUE_NAMES.EMAIL, this.ids.next(), {
      iv: iv.toString('hex'),
      tag: cipher.getAuthTag().toString('hex'),
      data: data.toString('hex'),
      expires: Date.now() + EMAIL_CRYPTO.TTL,
    });
  }
  public override async deliver(payload: unknown): Promise<void> {
    const sealed = payload as SealedEmail;
    if (sealed.expires < Date.now()) return;
    const email = this.unseal(sealed);
    const transport = createTransport({
      host: this.config.get('SMTP_HOST'),
      port: this.config.get('SMTP_PORT'),
      secure: this.config.get('SMTP_SECURE'),
      connectionTimeout: EMAIL_CRYPTO.TIMEOUT,
      socketTimeout: EMAIL_CRYPTO.TIMEOUT,
      ...(this.config.get('SMTP_USER')
        ? { auth: { user: this.config.get('SMTP_USER'), pass: this.config.get('SMTP_PASSWORD') } }
        : {}),
    });
    try {
      await this.calls.run(
        () =>
          transport.sendMail({
            from: this.config.get('EMAIL_FROM'),
            to: email.recipient,
            subject: this.i18n.translate(messageKey('emails.auth.subject'), { lang: email.locale }),
            text: this.i18n.translate(
              email.purpose === OTP_PURPOSE.RESET
                ? messageKey('emails.auth.passwordReset')
                : email.code
                  ? messageKey('emails.auth.otp')
                  : messageKey('emails.auth.accountExists'),
              { lang: email.locale, args: { code: email.code ?? '' } },
            ),
          }),
        {
          timeoutMs: EMAIL_CRYPTO.TIMEOUT,
          attempts: EMAIL_CRYPTO.ATTEMPTS,
          onTimeout: () => {
            transport.close();
          },
        },
      );
    } finally {
      transport.close();
    }
  }
  private unseal(sealed: SealedEmail): AuthEmail {
    const decipher = createDecipheriv(
      EMAIL_CRYPTO.ALGORITHM,
      this.key(),
      Buffer.from(sealed.iv, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(sealed.tag, 'hex'));
    return JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(sealed.data, 'hex')),
        decipher.final(),
      ]).toString(),
    ) as AuthEmail;
  }
}
