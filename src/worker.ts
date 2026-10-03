import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { connectInfrastructure } from './core/lifecycle/infrastructure';
import { registerProcessErrors } from './core/lifecycle/process-errors';
registerProcessErrors();
async function startWorker(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  await connectInfrastructure(app);
  app.get(Logger).log('Worker ready; no business processors registered in Phase 1');
  app.enableShutdownHooks();
}
void startWorker();
