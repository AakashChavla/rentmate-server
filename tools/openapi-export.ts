import 'reflect-metadata';
import { mkdirSync, writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ROUTES } from '../src/core/config/config.constants';
import { openApiDocument } from '../src/core/http/swagger';
async function exportOpenApi(): Promise<void> {
  process.env.DB_PASSWORD ??= 'schema-export-only';
  process.env.REDIS_URL ??= 'redis://localhost:6379';
  const app = await NestFactory.create(AppModule, { logger: false });
  try {
    app.setGlobalPrefix(ROUTES.PREFIX, {
      exclude: [
        { path: ROUTES.LIVE, method: RequestMethod.GET },
        { path: ROUTES.READY, method: RequestMethod.GET },
      ],
    });
    const document = openApiDocument(app);
    mkdirSync('docs', { recursive: true });
    writeFileSync('docs/openapi.json', JSON.stringify(document, null, 2) + '\n');
  } finally {
    await app.close();
  }
}
void exportOpenApi().catch(() => {
  process.stderr.write('OpenAPI export failed');
  process.exitCode = 1;
});
