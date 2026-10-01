export type EmailTemplateKey = 'otp';

export interface EmailTemplateDataMap {
  otp: {
    code: string;
    purpose: string;
    expiresInMinutes: number;
  };
}

export type EmailJob = {
  [K in EmailTemplateKey]: {
    template: K;
    to: string;
    data: EmailTemplateDataMap[K];
    locale?: string;
  };
}[EmailTemplateKey];
