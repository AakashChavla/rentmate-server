import type { QueueName } from '../config/config.constants';
export abstract class JobHandler {
  public abstract handle(jobId: string, data: unknown): Promise<void>;
}
export abstract class WorkerHost {
  public abstract register(queue: QueueName, handler: JobHandler): void;
  public abstract close(): Promise<void>;
}
