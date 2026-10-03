import { decodeCursor, encodeCursor } from './cursor';
describe('keyset cursors', () => {
  it('round trips and rejects malformed and extra-field cursors', () => {
    const item = { id: '00000000-0000-4000-8000-000000000001', createdAt: '2026-10-03T00:00:00Z' };
    expect(decodeCursor(encodeCursor(item))).toEqual(item);
    expect(decodeCursor(undefined)).toBeUndefined();
    for (const bad of [
      '!invalid',
      btoa('{}'),
      encodeCursor({ ...item, id: 'not-uuid' }),
      btoa(JSON.stringify({ ...item, evil: true })),
    ])
      expect(() => decodeCursor(bad)).toThrow();
  });
});
