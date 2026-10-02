export class InvalidCursorError extends Error {
  constructor() {
    super('Cursor is invalid');
    this.name = 'InvalidCursorError';
  }
}

export interface CursorPayload {
  createdAt: string;
  id: string;
}

const SEPARATOR = '|';

/** Encodes a keyset cursor as base64url of `created_at|id`. */
export function encodeCursor(createdAt: Date, id: string): string {
  if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) {
    throw new InvalidCursorError();
  }

  if (!id || id.includes(SEPARATOR)) {
    throw new InvalidCursorError();
  }

  return Buffer.from(`${createdAt.toISOString()}${SEPARATOR}${id}`, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): CursorPayload {
  if (!cursor || typeof cursor !== 'string') {
    throw new InvalidCursorError();
  }

  let decoded: string;
  try {
    decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  } catch {
    throw new InvalidCursorError();
  }

  const separatorIndex = decoded.indexOf(SEPARATOR);
  if (separatorIndex <= 0 || separatorIndex === decoded.length - 1) {
    throw new InvalidCursorError();
  }

  const createdAt = decoded.slice(0, separatorIndex);
  const id = decoded.slice(separatorIndex + 1);
  if (!id || Number.isNaN(Date.parse(createdAt))) {
    throw new InvalidCursorError();
  }

  return { createdAt, id };
}
