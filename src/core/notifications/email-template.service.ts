import { Injectable } from '@nestjs/common';
import type {
  EmailJob,
  EmailTemplateDataMap,
  EmailTemplateKey,
  TemplateMetadata,
} from './email-job.types';

export const BRAND_NAME = 'RentMate';

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

type TemplateRenderer<K extends EmailTemplateKey> = (
  data: EmailTemplateDataMap[K],
) => RenderedEmail;

export const TEMPLATE_METADATA_REGISTRY: Record<EmailTemplateKey, TemplateMetadata> = {
  otp: {
    removeOnComplete: true,
    removeOnFail: { age: 3600 },
  },
};

function renderLayout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 20px; color: #172b4d; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { font-size: 24px; font-weight: bold; margin-bottom: 24px; color: #091e42; }
    .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #0052cc; background: #f4f5f7; padding: 16px; border-radius: 6px; text-align: center; margin: 24px 0; }
    .footer { margin-top: 32px; font-size: 12px; color: #6b778c; border-top: 1px solid #ebecf0; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">${escapeHtml(BRAND_NAME)}</div>
    ${bodyHtml}
    <div class="footer">&copy; ${new Date().getFullYear()} ${escapeHtml(BRAND_NAME)}. All rights reserved.</div>
  </div>
</body>
</html>`;
}

function renderOtp(data: EmailTemplateDataMap['otp']): RenderedEmail {
  const code = escapeHtml(data.code);
  const minutes = data.expiresInMinutes;
  const purpose = data.purpose;

  let subject: string;
  let actionText: string;

  if (purpose === 'LOGIN') {
    subject = `Your ${BRAND_NAME} Login Code`;
    actionText = `Use the verification code below to log in to your ${BRAND_NAME} account.`;
  } else if (purpose === 'PASSWORD_RESET') {
    subject = `Reset your ${BRAND_NAME} Password`;
    actionText = `Use the verification code below to reset your ${BRAND_NAME} password.`;
  } else {
    subject = `Your ${BRAND_NAME} Verification Code`;
    actionText = `Use the verification code below to complete your request on ${BRAND_NAME}.`;
  }

  const html = renderLayout(
    subject,
    `<p>${escapeHtml(actionText)}</p>
     <div class="code">${code}</div>
     <p>This code will expire in ${minutes} minutes. If you did not request this code, please ignore this email.</p>`,
  );

  const text = `${BRAND_NAME}\n\n${actionText}\n\nVerification Code: ${data.code}\n\nThis code will expire in ${minutes} minutes. If you did not request this code, please ignore this email.`;

  return { subject, html, text };
}

@Injectable()
export class EmailTemplateService {
  private readonly registry: {
    [K in EmailTemplateKey]: TemplateRenderer<K>;
  } = {
    otp: renderOtp,
  };

  render(job: EmailJob): RenderedEmail {
    const renderer = this.registry[job.template] as TemplateRenderer<typeof job.template>;
    if (!renderer) {
      throw new Error(`No renderer registered for email template: ${job.template}`);
    }

    return renderer(job.data as never);
  }

  getTemplateMetadata(templateKey: EmailTemplateKey): TemplateMetadata {
    return TEMPLATE_METADATA_REGISTRY[templateKey] || {};
  }
}
