import type { QueueName } from '../config/config.constants';
export abstract class QueuePublisher {
  public abstract publish(
    queue: QueueName,
    jobId: string,
    data: Record<string, unknown>,
  ): Promise<void>;
  public abstract close(): Promise<void>;
}
