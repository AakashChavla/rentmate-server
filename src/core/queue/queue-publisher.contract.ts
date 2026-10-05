import type { QueueName } from '../config/config.constants';
export abstract class QueuePublisher {
  public schedule(queue: QueueName, jobId: string, every: number): Promise<void> {
    return this.publish(queue, jobId, { every });
  }
  public abstract publish(
    queue: QueueName,
    jobId: string,
    data: Record<string, unknown>,
  ): Promise<void>;
  public abstract close(): Promise<void>;
}
