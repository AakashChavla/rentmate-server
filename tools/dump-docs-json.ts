import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function dumpDocsJson() {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || 'postgresql://rentmate:rentmate@localhost:5432/rentmate';
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
  process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET || 'baseline-access-secret-value-16chars';
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || 'baseline-refresh-secret-value-16chars';

  const app = await NestFactory.create(AppModule, { logger: false });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('RentMate API')
    .setDescription(
      'HTTP API for RentMate. Versioned routes are served under /api/v1. Health probes are unversioned and are not wrapped in the response envelope.',
    )
    .setVersion('1.0')
    .addCookieAuth('rm_access', {
      type: 'apiKey',
      in: 'cookie',
      name: 'rm_access',
      description: 'Access token cookie. It is httpOnly and is not returned in JSON.',
    })
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const jsonOutput = JSON.stringify(document, null, 2);

  const outputPath = path.resolve(__dirname, 'baseline-docs-json.json');
  fs.writeFileSync(outputPath, jsonOutput);
  console.log('✅ Baseline OpenAPI spec written to:', outputPath);
  await app.close();
}

dumpDocsJson().catch((err) => {
  console.error('Error dumping docs json:', err);
  process.exit(1);
});
