import { minutes } from './duration';
export const READ_PERMISSION_SUFFIX = ':read';
export const UNIT_STATUS = {
  VACANT: 'VACANT',
  OCCUPIED: 'OCCUPIED',
  RESERVED: 'RESERVED',
  MAINTENANCE: 'MAINTENANCE',
  BLOCKED: 'BLOCKED',
} as const;
export const UNIT_TYPE = { ROOM: 'ROOM', FLAT: 'FLAT', SHOP: 'SHOP' } as const;
export const AMENITY = {
  AC: 'AC',
  WIFI: 'WIFI',
  ATTACHED_BATHROOM: 'ATTACHED_BATHROOM',
  BALCONY: 'BALCONY',
  PARKING: 'PARKING',
  WARDROBE: 'WARDROBE',
  GEYSER: 'GEYSER',
  POWER_BACKUP: 'POWER_BACKUP',
} as const;
export const FURNISHING = {
  NONE: 'UNFURNISHED',
  SEMI: 'SEMI_FURNISHED',
  FULL: 'FULLY_FURNISHED',
} as const;
export const UNIT_LIMITS = {
  CODE: 40,
  NAME: 100,
  WING: 60,
  CAPACITY: 200,
  PAGE: 50,
  AMENITIES: 16,
  FLOORS: 50,
  PER_FLOOR: 200,
  PREFIX: 10,
  START_FLOOR_MIN: -20,
  START_FLOOR_MAX: 200,
  CODE_PAD: 2,
  PERCENT: 100,
  PRECISION: 100,
} as const;
export const BULK_SYNC_LIMIT = 100;
export const BULK_MAX_UNITS = 10000;
export const OCCUPANCY_TTL = minutes(2);
export const MONEY_PATTERN = /^(0|[1-9]\d{0,9})\.\d{2}$/;
export const SIZE_PATTERN = /^(0|[1-9]\d{0,5})(\.\d{1,2})?$/;
export const PREFIX_PATTERN = /^[a-zA-Z0-9_-]{1,10}$/;
export const UNIT_DEFAULTS = {
  RENT: '0.00',
  CAPACITY: 1,
  START_FLOOR: 1,
  START_NUMBER: 1,
  WING: '',
} as const;
export const UNIT_PERMISSION = {
  READ: 'unit:read',
  CREATE: 'unit:create',
  UPDATE: 'unit:update',
  DELETE: 'unit:delete',
} as const;
export const UNIT_EVENT = {
  STATUS_CHANGED: 'unit.status_changed',
  STRUCTURE_CHANGED: 'unit.structure_changed',
} as const;
export const BULK_STATUS = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
export const BULK_MODE = { SYNC: 'SYNC', QUEUED: 'QUEUED' } as const;
export const OCCUPANCY_KEYS = {
  version: (org: string, property: string): string =>
    'rm:occupancy:version:' + org + ':' + property,
  data: (org: string, property: string): string => 'rm:occupancy:' + org + ':' + property,
} as const;
export const STATUS_TRANSITIONS: Readonly<Record<keyof typeof UNIT_STATUS, readonly string[]>> = {
  VACANT: [
    UNIT_STATUS.OCCUPIED,
    UNIT_STATUS.RESERVED,
    UNIT_STATUS.MAINTENANCE,
    UNIT_STATUS.BLOCKED,
  ],
  OCCUPIED: [UNIT_STATUS.VACANT, UNIT_STATUS.MAINTENANCE],
  RESERVED: [
    UNIT_STATUS.VACANT,
    UNIT_STATUS.OCCUPIED,
    UNIT_STATUS.MAINTENANCE,
    UNIT_STATUS.BLOCKED,
  ],
  MAINTENANCE: [UNIT_STATUS.VACANT, UNIT_STATUS.BLOCKED],
  BLOCKED: [UNIT_STATUS.VACANT, UNIT_STATUS.MAINTENANCE],
};
