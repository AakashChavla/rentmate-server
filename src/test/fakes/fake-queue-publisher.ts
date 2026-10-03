import type { QueueName } from '../../core/config/config.constants';
import { QueuePublisher } from '../../core/queue/queue-publisher.contract';
export class FakeQueuePublisher extends QueuePublisher {
  public readonly jobs: { queue: QueueName; jobId: string; data: Record<string, unknown> }[] = [];
  public override async publish(
    queue: QueueName,
    jobId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await Promise.resolve();
    if (!this.jobs.some((job) => job.jobId === jobId && job.queue === queue))
      this.jobs.push({ queue, jobId, data });
  }
  public override async close(): Promise<void> {
    await Promise.resolve();
  }
}
