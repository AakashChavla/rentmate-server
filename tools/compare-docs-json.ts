import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function verifyOpenApiSpec() {
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
  const currentJson = JSON.stringify(document, null, 2);

  const baselinePath = path.resolve(__dirname, 'baseline-docs-json.json');
  const baselineJson = fs.readFileSync(baselinePath, 'utf8');

  if (currentJson === baselineJson) {
    console.log('✅ OPENAPI SPEC MATCHES BASELINE EXACTLY! (0 DIFFS)');
  } else {
    console.error(
      '❌ OpenAPI spec diff detected! Lengths:',
      currentJson.length,
      baselineJson.length,
    );
    for (let i = 0; i < Math.min(currentJson.length, baselineJson.length); i++) {
      if (currentJson[i] !== baselineJson[i]) {
        console.error(
          'Diff at index',
          i,
          'Current:',
          currentJson.slice(i, i + 50),
          'Baseline:',
          baselineJson.slice(i, i + 50),
        );
        break;
      }
    }
    process.exit(1);
  }
  await app.close();
}

verifyOpenApiSpec().catch((err) => {
  console.error('Error in verifyOpenApiSpec:', err);
  process.exit(1);
});
