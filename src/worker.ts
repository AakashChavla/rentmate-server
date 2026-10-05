import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { connectInfrastructure } from './core/lifecycle/infrastructure';
import { registerProcessErrors } from './core/lifecycle/process-errors';
import { WorkerHost } from './core/queue/worker-host.contract';
import { QueuePublisher } from './core/queue/queue-publisher.contract';
import { EmailJob } from './integrations/email/email-job.contract';
import { RegistrationCleanup } from './modules/auth/registration-cleanup.contract';
import { QUEUE_NAMES } from './core/config/config.constants';
import { CLEANUP_JOB, IDENTITY_TTL } from './shared/identity.constants';
registerProcessErrors();
async function startWorker(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  await connectInfrastructure(app);
  app.get(WorkerHost).register(QUEUE_NAMES.EMAIL, app.get(EmailJob));
  app.get(WorkerHost).register(QUEUE_NAMES.REGISTRATION_CLEANUP, app.get(RegistrationCleanup));
  await app
    .get(QueuePublisher)
    .schedule(QUEUE_NAMES.REGISTRATION_CLEANUP, CLEANUP_JOB, IDENTITY_TTL.CLEANUP);
  app.get(Logger).log('Identity email and registration cleanup worker ready');
  app.enableShutdownHooks();
}
void startWorker();
