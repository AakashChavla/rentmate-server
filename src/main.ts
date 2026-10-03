import 'reflect-metadata';
import { createApplication } from './bootstrap';
import { AppConfig } from './core/config/app-config.contract';
import { connectInfrastructure } from './core/lifecycle/infrastructure';
import { registerProcessErrors } from './core/lifecycle/process-errors';
registerProcessErrors();
async function bootstrap(): Promise<void> {
  const app = await createApplication();
  await connectInfrastructure(app);
  await app.listen(app.get(AppConfig).get('PORT'));
}
void bootstrap();
