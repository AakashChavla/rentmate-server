import { applyDecorators, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

export function ApiDataResponse<T extends Type>(model: T, description: string): MethodDecorator {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description,
      schema: envelopeSchema({ $ref: getSchemaPath(model) }),
    }),
  );
}

export function ApiAcceptedResponse(description: string): MethodDecorator {
  return ApiOkResponse({
    description,
    schema: envelopeSchema({
      type: 'object',
      properties: { accepted: { type: 'boolean', example: true } },
    }),
  });
}

function envelopeSchema(data: Record<string, unknown>): Record<string, unknown> {
  return {
    type: 'object',
    required: ['success', 'data', 'meta'],
    properties: {
      success: { type: 'boolean', example: true },
      data,
      meta: {
        type: 'object',
        properties: {
          requestId: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          page: {
            type: 'object',
            properties: {
              limit: { type: 'number' },
              hasNext: { type: 'boolean' },
              nextCursor: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
  };
}
