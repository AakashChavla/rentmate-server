import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { AppConfigService } from '../../../config/app-config.service';
import { EmailDeliveryError } from '../email-delivery.error';
import { EmailMessage, EmailProvider, EmailSendResult } from '../email.provider';

export const SMTP_MAX_CONNECTIONS = 2;
export const SMTP_MAX_MESSAGES = 100;
export const SMTP_RATE_DELTA = 1000;
export const SMTP_RATE_LIMIT = 5;

@Injectable()
export class SmtpEmailProvider extends EmailProvider implements OnModuleInit {
  private readonly logger = new Logger(SmtpEmailProvider.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;
  private readonly replyToAddress?: string;

  constructor(config: AppConfigService, customTransporter?: Transporter) {
    super();

    const emailConfig = config.email;
    const from = emailConfig.from;
    const user = emailConfig.smtp.user;
    const pass = emailConfig.smtp.password;

    if (customTransporter) {
      this.transporter = customTransporter;
      this.fromAddress = from || 'noreply@rentmate.local';
      this.replyToAddress = emailConfig.replyTo;
      return;
    }

    const missing: string[] = [];
    if (!from) missing.push('EMAIL_FROM');
    if (!user) missing.push('SMTP_USER');
    if (!pass) missing.push('SMTP_PASSWORD');

    if (missing.length > 0) {
      throw new Error(
        `Failed fast: missing required SMTP configuration: ${missing.join(', ')}. Please set them in your environment.`,
      );
    }

    this.fromAddress = from!;
    this.replyToAddress = emailConfig.replyTo;

    this.transporter = nodemailer.createTransport({
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      secure: emailConfig.smtp.secure,
      auth: {
        user,
        pass,
      },
      pool: true,
      maxConnections: SMTP_MAX_CONNECTIONS,
      maxMessages: SMTP_MAX_MESSAGES,
      rateDelta: SMTP_RATE_DELTA,
      rateLimit: SMTP_RATE_LIMIT,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP transporter verified successfully');
    } catch (error) {
      this.logger.warn(
        `SMTP transporter verification failed on startup: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo ?? this.replyToAddress,
        headers: message.headers,
      });

      return {
        providerMessageId: info.messageId,
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): EmailDeliveryError {
    if (error instanceof EmailDeliveryError) {
      return error;
    }

    const err = error as {
      code?: string;
      responseCode?: number;
      response?: string;
      message?: string;
    };

    const message = err.message || 'SMTP delivery failed';
    const responseCode = err.responseCode;
    const responseStr = err.response || '';
    const errCode = err.code || '';

    const isDailyLimit =
      responseStr.includes('5.4.5') ||
      responseStr.toLowerCase().includes('daily user sending limit exceeded') ||
      message.toLowerCase().includes('daily user sending limit exceeded');

    if (isDailyLimit) {
      this.logger.error('Gmail daily sending limit exceeded (5.4.5). Email delivery failed.');
      return new EmailDeliveryError(
        'Gmail daily sending limit exceeded',
        false,
        'DAILY_LIMIT_EXCEEDED',
      );
    }

    if (
      responseCode === 535 ||
      responseCode === 534 ||
      responseCode === 550 ||
      responseCode === 553
    ) {
      return new EmailDeliveryError(message, false, `SMTP_${responseCode}`);
    }

    if (responseCode && responseCode >= 500 && responseCode < 600) {
      return new EmailDeliveryError(message, false, `SMTP_${responseCode}`);
    }

    if (responseCode && responseCode >= 400 && responseCode < 500) {
      return new EmailDeliveryError(message, true, `SMTP_${responseCode}`);
    }

    const retryableCodes = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ESOCKETTIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN',
      'ECONNREFUSED',
    ];
    if (errCode && retryableCodes.includes(errCode)) {
      return new EmailDeliveryError(message, true, errCode);
    }

    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('timeout') || lowerMsg.includes('connection')) {
      return new EmailDeliveryError(message, true, 'TIMEOUT_OR_CONNECTION_ERROR');
    }

    return new EmailDeliveryError(message, true, 'UNKNOWN_SMTP_ERROR');
  }
}
