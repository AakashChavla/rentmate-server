import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AppConfig } from '../config/app-config.contract';
import { QueuePublisher } from './queue-publisher.contract';
import { LIMITS, TTL, type QueueName } from '../config/config.constants';
export const jobOptions = {
  attempts: LIMITS.JOB_ATTEMPTS,
  backoff: { type: 'exponential', delay: TTL.JOB_BACKOFF },
  removeOnComplete: { count: LIMITS.RETAIN_COMPLETED },
  removeOnFail: { count: LIMITS.RETAIN_FAILED },
};
@Injectable()
export class BullQueuePublisher extends QueuePublisher {
  private readonly queues = new Map<QueueName, Queue>();
  public constructor(@Inject(AppConfig) private readonly config: AppConfig) {
    super();
  }
  public override async publish(
    name: QueueName,
    jobId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    let queue = this.queues.get(name);
    if (!queue) {
      queue = new Queue(name, {
        connection: { url: this.config.get('REDIS_URL') },
        defaultJobOptions: jobOptions,
      });
      this.queues.set(name, queue);
    }
    await queue.add(name, data, { jobId });
  }
  public override async close(): Promise<void> {
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
  }
}
