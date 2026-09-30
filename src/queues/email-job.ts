export interface EmailJob {
  to: string;
  purpose: string;
  template: 'otp';
  code?: string;
}
