import { definedFields } from './defined-fields';
import { z } from 'zod';
import {
  AMENITY,
  FURNISHING,
  SIZE_PATTERN,
  MONEY_PATTERN,
  UNIT_LIMITS as L,
  UNIT_TYPE as T,
  UNIT_STATUS as S,
  UNIT_DEFAULTS as D,
  PREFIX_PATTERN,
  BULK_MAX_UNITS,
} from '../../shared/unit.constants';
import type { UnitConfiguration, UnitInput, BulkPattern } from '../../shared/unit.types';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
const configuration = z
  .object({
    amenities: z
      .array(z.enum(Object.values(AMENITY)))
      .max(L.AMENITIES)
      .refine((values) => new Set(values).size === values.length)
      .default([]),
    size: z.string().regex(SIZE_PATTERN).nullable().default(null),
    furnishing: z.enum(Object.values(FURNISHING)).default(FURNISHING.NONE),
  })
  .strict();
export const UNIT_INPUT_SCHEMA = z
  .object({
    floorId: z.uuid().nullable().optional(),
    code: z.string().trim().min(1).max(L.CODE),
    type: z.enum(Object.values(T)),
    baseRent: z.string().regex(MONEY_PATTERN),
    capacity: z.number().int().min(1).max(L.CAPACITY),
    configuration: configuration.partial().optional(),
  })
  .strict();
export const BULK_PATTERN_SCHEMA = z
  .object({
    floors: z.number().int().min(1).max(L.FLOORS),
    perFloor: z.number().int().min(1).max(L.PER_FLOOR),
    prefix: z.string().regex(PREFIX_PATTERN),
    startFloor: z
      .number()
      .int()
      .min(L.START_FLOOR_MIN)
      .max(L.START_FLOOR_MAX)
      .default(D.START_FLOOR),
    startNumber: z.number().int().min(1).max(BULK_MAX_UNITS).default(D.START_NUMBER),
    wing: z.string().trim().max(L.WING).default(D.WING),
    type: z.enum(Object.values(T)).default(T.ROOM),
    baseRent: z.string().regex(MONEY_PATTERN).default(D.RENT),
    capacity: z.number().int().min(1).max(L.CAPACITY).default(D.CAPACITY),
  })
  .strict()
  .refine(
    (value) =>
      value.floors * value.perFloor <= BULK_MAX_UNITS &&
      value.startFloor + value.floors - 1 <= L.START_FLOOR_MAX,
  );
export function unitConfiguration(input: Partial<UnitConfiguration>): UnitConfiguration {
  const value = configuration.safeParse(definedFields(input));
  if (!value.success) throw new AppException(ErrorCode.INVALID_UNIT_CONFIG);
  return value.data;
}
export function requireUnitInput(input: UnitInput): void {
  if (!UNIT_INPUT_SCHEMA.safeParse(input).success)
    throw new AppException(ErrorCode.VALIDATION_ERROR);
}
export function bulkPattern(input: BulkPattern): BulkPattern {
  const result = BULK_PATTERN_SCHEMA.safeParse(input);
  if (!result.success) throw new AppException(ErrorCode.VALIDATION_ERROR);
  return result.data;
}
export function requireVacant(status: string): void {
  if (status === S.OCCUPIED || status === S.RESERVED) throw new AppException(ErrorCode.UNIT_IN_USE);
}
export function bulkCode(prefix: string, floor: number, index: number): string {
  return (
    prefix + String(floor).padStart(L.CODE_PAD, '0') + '-' + String(index).padStart(L.CODE_PAD, '0')
  );
}
