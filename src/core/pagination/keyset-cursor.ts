import { AppException } from '../errors/app-exception';
import { ErrorCode } from '../errors/error-code.constants';
export function decodeKeysetCursor(cursor: string): { time: string; id: string } {
  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    if (!valid(value)) throw new AppException(ErrorCode.INVALID_CURSOR);
    return value;
  } catch {
    throw new AppException(ErrorCode.INVALID_CURSOR);
  }
}
function valid(value: unknown): value is { time: string; id: string } {
  return !!value && typeof value === 'object' && validTime(value) && validId(value);
}
function validTime(value: object): boolean {
  return (
    'time' in value && typeof value.time === 'string' && Number.isFinite(Date.parse(value.time))
  );
}
function validId(value: object): boolean {
  return (
    'id' in value &&
    typeof value.id === 'string' &&
    /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value.id)
  );
}
export function encodeKeysetCursor(time: string, id: string): string {
  return Buffer.from(JSON.stringify({ time, id })).toString('base64url');
}
