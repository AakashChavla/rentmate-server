import type { DefaultJobOptions } from 'bullmq';

export const QueueName = {
  NotificationEmail: 'notification.email',
  NotificationSms: 'notification.sms',
  NotificationWhatsapp: 'notification.whatsapp',
  NotificationFcm: 'notification.fcm',
  InvoiceGenerate: 'invoice.generate',
  InvoiceOverdue: 'invoice.overdue',
  LeaseExpiryCheck: 'lease.expiry-check',
  ReportGenerate: 'report.generate',
  DocumentProcess: 'document.process',
  WebhookProcess: 'webhook.process',
} as const;

export type QueueName = (typeof QueueName)[keyof typeof QueueName];

export const QUEUE_NAMES: readonly QueueName[] = Object.values(QueueName);

export const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};
