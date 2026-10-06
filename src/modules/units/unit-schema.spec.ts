import { UNIT_INPUT_SCHEMA, BULK_PATTERN_SCHEMA, bulkCode, unitConfiguration } from './unit-schema';
describe('unit input boundaries', () => {
  test.each(['0.00', '1234567890.99', '4999.50'])('accepts exact decimal %s', (baseRent) => {
    expect(
      UNIT_INPUT_SCHEMA.safeParse({ code: '101', type: 'ROOM', baseRent, capacity: 2 }).success,
    ).toBe(true);
  });
  test.each([1.25, '1.2', '-1.00', '01.00', '12345678901.00', '1e3', null])(
    'rejects invalid money %s',
    (baseRent) => {
      expect(
        UNIT_INPUT_SCHEMA.safeParse({ code: '101', type: 'ROOM', baseRent, capacity: 2 }).success,
      ).toBe(false);
    },
  );
  it('validates amenities, dimensions and unknown keys', () => {
    for (const input of [
      { amenities: ['WIFI', 'WIFI'] },
      { amenities: ['UNKNOWN'] },
      { size: '-1' },
      { surprise: true },
    ])
      expect(() => unitConfiguration(input as Parameters<typeof unitConfiguration>[0])).toThrow();
    expect(unitConfiguration({ amenities: ['WIFI'], size: '42.50' }).size).toBe('42.50');
  });
  it('bounds bulk generation and produces stable codes', () => {
    expect(BULK_PATTERN_SCHEMA.safeParse({ floors: 2, perFloor: 3, prefix: 'A' }).success).toBe(
      true,
    );
    expect(BULK_PATTERN_SCHEMA.safeParse({ floors: 51, perFloor: 200, prefix: 'A' }).success).toBe(
      false,
    );
    expect(
      BULK_PATTERN_SCHEMA.safeParse({ floors: 2, perFloor: 2, prefix: 'A', startFloor: 200 })
        .success,
    ).toBe(false);
    expect(bulkCode('A', 1, 2)).toBe('A01-02');
  });
});
