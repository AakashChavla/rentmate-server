import 'reflect-metadata';
import pino from 'pino';
import { createApplication } from './bootstrap';
import { AppConfig } from './core/config/app-config.contract';
async function bootstrap(): Promise<void> {
  const app = await createApplication();
  await app.listen(app.get(AppConfig).get('PORT'));
}
void bootstrap().catch((error: unknown) => {
  pino().fatal({ err: error }, 'Application startup failed');
  process.exitCode = 1;
});
