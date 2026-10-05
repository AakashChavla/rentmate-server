import { z } from 'zod';
import {
  PROPERTY_TYPE as T,
  PROPERTY_DEFAULTS as D,
  PROPERTY_LIMITS as L,
} from '../../shared/property.constants';
import type { PropertyType, PropertyConfiguration } from '../../shared/property.types';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
const currency = z.literal(D.CURRENCY).default(D.CURRENCY);
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const hotel = z.strictObject({
  currency,
  checkInTime: time.default(D.CHECK_IN),
  checkOutTime: time.default(D.CHECK_OUT),
});
const rent = z.strictObject({
  currency,
  rentDueDay: z.number().int().min(1).max(L.DAY).default(D.DUE_DAY),
  graceDays: z.number().int().min(0).max(L.GRACE).default(D.GRACE_DAYS),
});
export const PROPERTY_CONFIG_SCHEMAS = {
  [T.HOTEL]: hotel,
  [T.PG]: rent,
  [T.APARTMENT]: rent,
  [T.FLAT]: rent,
};
const hotelPatch = z
  .strictObject({ currency: z.literal(D.CURRENCY), checkInTime: time, checkOutTime: time })
  .partial();
const rentPatch = z
  .strictObject({
    currency: z.literal(D.CURRENCY),
    rentDueDay: z.number().int().min(1).max(L.DAY),
    graceDays: z.number().int().min(0).max(L.GRACE),
  })
  .partial();
const PATCH_SCHEMAS = {
  [T.HOTEL]: hotelPatch,
  [T.PG]: rentPatch,
  [T.APARTMENT]: rentPatch,
  [T.FLAT]: rentPatch,
};
export function configurationPatch(
  type: PropertyType,
  input: Partial<PropertyConfiguration>,
): Partial<PropertyConfiguration> {
  const fields = Object.fromEntries(
    Object.entries(input).filter(([, value]: [string, unknown]) => value !== undefined),
  );
  const result = PATCH_SCHEMAS[type].safeParse(fields);
  if (!result.success) throw new AppException(ErrorCode.INVALID_PROPERTY_CONFIG);
  return result.data as Partial<PropertyConfiguration>;
}
export function configuration(type: PropertyType, input: unknown): PropertyConfiguration {
  const fields =
    typeof input === 'object' && input !== null && !Array.isArray(input)
      ? Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined))
      : input;
  const result = PROPERTY_CONFIG_SCHEMAS[type].safeParse(fields);
  if (!result.success) throw new AppException(ErrorCode.INVALID_PROPERTY_CONFIG);
  return result.data;
}
export function requireTimezone(timezone: string | null | undefined): void {
  if (!timezone) return;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch {
    throw new AppException(ErrorCode.VALIDATION_ERROR);
  }
}
