import 'reflect-metadata';
import { mkdirSync, writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
async function exportOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  try {
    await app.init();
    const config = new DocumentBuilder().setTitle('RentMate API').setVersion('0.1.0').build();
    const document = SwaggerModule.createDocument(app, config);
    mkdirSync('docs', { recursive: true });
    writeFileSync('docs/openapi.json', JSON.stringify(document, null, 2) + '\n');
  } finally {
    await app.close();
  }
}
void exportOpenApi().catch((error: unknown) => {
  process.stderr.write(String(error));
  process.exitCode = 1;
});
