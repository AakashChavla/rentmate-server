import { PAGINATION } from './pagination.constants';
export interface Cursor {
  createdAt: string;
  id: string;
}
export interface PaginatedResult<T> {
  items: T[];
  page: { limit: number; hasNext: boolean; nextCursor: string | null };
}
export class CursorError extends Error {
  public constructor() {
    super(PAGINATION.INVALID_CURSOR);
  }
}
export function encodeCursor(cursor: Cursor): string {
  return btoa(JSON.stringify(cursor)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
function validateObject(parsed: unknown): Cursor {
  if (!parsed || typeof parsed !== 'object') throw new CursorError();
  const item = parsed as Record<string, unknown>;
  if (typeof item.id !== 'string' || !PAGINATION.UUID.test(item.id)) throw new CursorError();
  if (typeof item.createdAt !== 'string' || !Number.isFinite(Date.parse(item.createdAt)))
    throw new CursorError();
  if (Object.keys(item).length !== CURSOR_FIELDS) throw new CursorError();
  return { id: item.id, createdAt: item.createdAt };
}
export function decodeCursor(value: string | undefined): Cursor | undefined {
  if (value === undefined) return undefined;
  try {
    if (value.length > PAGINATION.CURSOR_MAX_LENGTH || !PAGINATION.BASE64URL.test(value))
      throw new CursorError();
    const parsed: unknown = JSON.parse(atob(value.replaceAll('-', '+').replaceAll('_', '/')));
    const item = validateObject(parsed);
    if (encodeCursor(item) !== value) throw new CursorError();
    return item;
  } catch {
    throw new CursorError();
  }
}
const CURSOR_FIELDS = 2;
