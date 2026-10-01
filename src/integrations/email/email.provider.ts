export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface EmailSendResult {
  providerMessageId?: string;
}

export abstract class EmailProvider {
  abstract send(message: EmailMessage): Promise<EmailSendResult>;
}
