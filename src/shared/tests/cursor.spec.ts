import { decodeCursor, encodeCursor, InvalidCursorError } from '../cursor';

describe('cursor pagination', () => {
  const createdAt = new Date('2026-03-01T10:15:30.000Z');
  const id = '6f1c8c3e-1b2a-4d5e-9f70-123456789abc';

  it('round-trips created_at and id', () => {
    const cursor = encodeCursor(createdAt, id);
    expect(cursor).not.toContain(createdAt.toISOString());
    expect(decodeCursor(cursor)).toEqual({
      createdAt: createdAt.toISOString(),
      id,
    });
  });

  it('rejects cursors that are not a created_at and id pair', () => {
    expect(() => decodeCursor('')).toThrow(InvalidCursorError);
    expect(() => decodeCursor('not-a-cursor')).toThrow(InvalidCursorError);
    expect(() => encodeCursor(new Date('invalid'), id)).toThrow(InvalidCursorError);
    expect(() => encodeCursor(createdAt, '')).toThrow(InvalidCursorError);
  });
});
