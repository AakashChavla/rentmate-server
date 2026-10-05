import { configuration, configurationPatch, requireTimezone } from './property-schema';
import { PROPERTY_TYPE as T } from '../../shared/property.constants';
describe('type-specific configuration', () => {
  it('validates partial patches without injecting defaults or unsupported fields', () => {
    expect(configurationPatch(T.HOTEL, { checkInTime: '15:00' })).toEqual({ checkInTime: '15:00' });
    expect(configurationPatch(T.PG, { graceDays: 0 })).toEqual({ graceDays: 0 });
    expect(() => configurationPatch(T.HOTEL, { rentDueDay: 1 })).toThrow();
    expect(() => configurationPatch(T.PG, { checkOutTime: '11:00' })).toThrow();
  });
  it('ignores absent DTO fields but rejects unsupported fields with values', () => {
    expect(configuration(T.HOTEL, { currency: 'INR', rentDueDay: undefined })).toEqual({
      currency: 'INR',
      checkInTime: '14:00',
      checkOutTime: '11:00',
    });
    expect(() => configuration(T.HOTEL, { currency: 'INR', rentDueDay: 1 })).toThrow();
  });
  it.each(Object.values(T))('supplies safe defaults for %s', (type) => {
    const result = configuration(type, {});
    expect(result.currency).toBe('INR');
    if (type === T.HOTEL)
      expect(result).toEqual({ currency: 'INR', checkInTime: '14:00', checkOutTime: '11:00' });
    else expect(result).toEqual({ currency: 'INR', rentDueDay: 1, graceDays: 5 });
  });
  it.each(Object.values(T))('rejects unsupported fields for %s', (type) => {
    expect(() =>
      configuration(type, type === T.HOTEL ? { rentDueDay: 1 } : { checkInTime: '14:00' }),
    ).toThrow();
  });
  it('rejects invalid time, currency, day, grace and timezone values', () => {
    for (const input of [{ checkInTime: '25:00' }, { currency: 'INVALID' }])
      expect(() => configuration(T.HOTEL, input)).toThrow();
    for (const input of [
      { rentDueDay: 0 },
      { rentDueDay: 29 },
      { graceDays: -1 },
      { graceDays: 32 },
    ])
      expect(() => configuration(T.PG, input)).toThrow();
    expect(() => {
      requireTimezone('No/Such');
    }).toThrow();
    expect(() => {
      requireTimezone('Asia/Kolkata');
    }).not.toThrow();
  });
});
