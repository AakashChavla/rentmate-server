export class EmailDeliveryError extends Error {
  readonly retryable: boolean;
  readonly reason?: string;

  constructor(message: string, retryable: boolean, reason?: string) {
    super(message);
    this.name = 'EmailDeliveryError';
    this.retryable = retryable;
    this.reason = reason;
  }
}
