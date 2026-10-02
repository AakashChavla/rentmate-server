import { Logger } from '@nestjs/common';
import { WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

/**
 * Shared worker lifecycle for later queue processors.
 * Subclasses add `@Processor(QueueName.X)` and implement `handle`.
 */
export abstract class BaseProcessor<T = unknown> extends WorkerHost {
  protected readonly logger = new Logger(this.constructor.name);

  override async process(job: Job<T>): Promise<unknown> {
    this.logger.log({
      msg: 'Processing job',
      jobId: job.id,
      queue: job.queueName,
      attempt: job.attemptsMade + 1,
    });

    try {
      return await this.handle(job);
    } catch (error) {
      this.logger.error(
        {
          msg: 'Job failed',
          jobId: job.id,
          queue: job.queueName,
          attempt: job.attemptsMade + 1,
        },
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  protected abstract handle(job: Job<T>): Promise<unknown>;
}
