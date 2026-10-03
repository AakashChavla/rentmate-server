import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { parseEnvironment } from './core/config/environment';

export async function bootstrap() {
  const config = parseEnvironment(process.env);
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: config.CLIENT_ORIGIN, credentials: true });
  app.enableShutdownHooks();
  await app.listen(config.PORT, '0.0.0.0');
}
