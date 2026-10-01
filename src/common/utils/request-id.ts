import { randomUUID } from 'node:crypto';

const SAFE_REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{7,127}$/;

export function resolveRequestId(header: string | string[] | undefined): string {
  const value = Array.isArray(header) ? header[0] : header;
  if (value && SAFE_REQUEST_ID.test(value)) {
    return value;
  }

  return randomUUID();
}

export function getRequestId(request: { id?: unknown; requestId?: unknown }): string {
  if (typeof request.id === 'string' && request.id.length > 0) {
    return request.id;
  }

  if (typeof request.requestId === 'string' && request.requestId.length > 0) {
    return request.requestId;
  }

  return 'unknown';
}
