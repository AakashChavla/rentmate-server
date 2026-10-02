require('reflect-metadata');
const fs = require('fs');
const path = require('path');
const { NestFactory } = require('@nestjs/core');
const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');
const { AppModule } = require('../dist/app.module.js');

async function verifyOpenApiSpec() {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://rentmate:rentmate@localhost:5432/rentmate';
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
  process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'baseline-access-secret-value-16chars';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'baseline-refresh-secret-value-16chars';

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
    process.stdout.write('✅ OPENAPI SPEC MATCHES BASELINE EXACTLY! (0 DIFFS)\n');
  } else {
    process.stderr.write(`❌ OpenAPI spec diff detected! currentLength=${currentJson.length} baselineLength=${baselineJson.length}\n`);
    for (let i = 0; i < Math.min(currentJson.length, baselineJson.length); i++) {
      if (currentJson[i] !== baselineJson[i]) {
        process.stderr.write(`Diff index ${i}: current="${currentJson.slice(i, i + 30)}" vs baseline="${baselineJson.slice(i, i + 30)}"\n`);
        break;
      }
    }
    process.exit(1);
  }
  await app.close();
}

verifyOpenApiSpec().catch((err) => {
  process.stderr.write(`Error in verifyOpenApiSpec: ${err && err.stack ? err.stack : err}\n`);
  process.exit(1);
});
