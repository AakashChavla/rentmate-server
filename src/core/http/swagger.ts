import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { COOKIE_NAMES, ROUTES } from '../config/config.constants';
export function openApiDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('RentMate API')
      .setVersion('1.0.0')
      .addCookieAuth(COOKIE_NAMES.ACCESS)
      .build(),
  );
}
export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup(ROUTES.DOCS, app, openApiDocument(app), { jsonDocumentUrl: ROUTES.SPEC });
}
