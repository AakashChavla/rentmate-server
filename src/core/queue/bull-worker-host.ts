import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { Worker } from 'bullmq';
import { AppConfig } from '../config/app-config.contract';
import { WorkerHost, JobHandler } from './worker-host.contract';
import type { QueueName } from '../config/config.constants';
import { bullRedisConnection } from './bull-redis-connection';
@Injectable()
export class BullWorkerHost extends WorkerHost implements OnApplicationShutdown {
  private readonly workers: Worker[] = [];
  public constructor(@Inject(AppConfig) private readonly config: AppConfig) {
    super();
  }
  public override register(queue: QueueName, handler: JobHandler): void {
    const worker = new Worker<unknown>(queue, (job) => handler.handle(job.id ?? '', job.data), {
      connection: bullRedisConnection(this.config.get('REDIS_URL')),
      concurrency: this.config.get('WORKER_CONCURRENCY'),
    });
    this.workers.push(worker);
  }
  public override async close(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.close()));
  }
  public async onApplicationShutdown(): Promise<void> {
    await this.close();
  }
}
