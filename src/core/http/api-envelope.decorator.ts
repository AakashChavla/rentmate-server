import { applyDecorators, HttpStatus, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
export function ApiEnvelope(
  model: Type<object>,
  status: number = HttpStatus.OK,
  array = false,
): MethodDecorator {
  return applyDecorators(
    ...(model === String ? [] : [ApiExtraModels(model)]),
    ApiResponse({
      status,
      schema: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: array
            ? {
                type: 'array',
                items: model === String ? { type: 'string' } : { $ref: getSchemaPath(model) },
              }
            : { $ref: getSchemaPath(model) },
          meta: {
            type: 'object',
            required: ['requestId', 'timestamp'],
            properties: {
              requestId: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              page: {
                type: 'object',
                properties: {
                  limit: { type: 'integer' },
                  hasNext: { type: 'boolean' },
                  nextCursor: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
      },
    }),
  );
}
