export type OtpPurpose = 'LOGIN' | 'PASSWORD_RESET' | 'EMAIL_VERIFICATION';

export type EmailTemplateKey = 'otp';

export interface EmailTemplateDataMap {
  otp: {
    code: string;
    purpose: OtpPurpose;
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

export interface TemplateMetadata {
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number | { age: number; count?: number };
}
