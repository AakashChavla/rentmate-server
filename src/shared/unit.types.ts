import type {
  UNIT_STATUS,
  UNIT_TYPE,
  AMENITY,
  FURNISHING,
  BULK_STATUS,
  BULK_MODE,
} from './unit.constants';
export type UnitStatus = (typeof UNIT_STATUS)[keyof typeof UNIT_STATUS];
export type UnitType = (typeof UNIT_TYPE)[keyof typeof UNIT_TYPE];
export type Amenity = (typeof AMENITY)[keyof typeof AMENITY];
export type Furnishing = (typeof FURNISHING)[keyof typeof FURNISHING];
export interface FloorInput {
  name: string;
  level: number;
  wing?: string;
}
export interface FloorRecord {
  id: string;
  organizationId: string;
  propertyId: string;
  name: string;
  level: number;
  wing: string;
  createdAt: Date;
}
export interface UnitConfiguration {
  amenities: Amenity[];
  size: string | null;
  furnishing: Furnishing;
}
export interface UnitInput {
  floorId?: string | null;
  code: string;
  type: UnitType;
  baseRent: string;
  capacity: number;
  configuration?: Partial<UnitConfiguration>;
}
export type UnitPatch = Partial<Omit<UnitInput, 'configuration'>>;
export interface UnitRecord extends Omit<UnitInput, 'floorId' | 'configuration'> {
  id: string;
  organizationId: string;
  propertyId: string;
  floorId: string | null;
  status: UnitStatus;
  createdAt: Date;
  floorName?: string | null;
  wing?: string | null;
  floorLevel?: number | null;
}
export interface BedRecord {
  id: string;
  organizationId: string;
  propertyId: string;
  unitId: string;
  label: string;
  status: UnitStatus;
  createdAt: Date;
}
export interface UnitFilter {
  propertyId?: string;
  floorId?: string;
  type?: UnitType;
  status?: UnitStatus;
  search?: string;
  cursor?: string;
}
export interface UnitPage {
  items: UnitRecord[];
  nextCursor: string | null;
}
export interface StatusInput {
  status: UnitStatus;
  expectedStatus?: UnitStatus;
}
export interface BulkPattern {
  floors: number;
  perFloor: number;
  prefix: string;
  startFloor: number;
  startNumber: number;
  wing: string;
  type: UnitType;
  baseRent: string;
  capacity: number;
}
export interface BulkRecord {
  id: string;
  organizationId: string;
  propertyId: string;
  requestedBy: string;
  pattern: BulkPattern;
  status: (typeof BULK_STATUS)[keyof typeof BULK_STATUS];
  createdCount: number;
  errorCode: string | null;
  createdAt: Date;
}
export interface BulkResult {
  mode: (typeof BULK_MODE)[keyof typeof BULK_MODE];
  createdCount: number;
  jobId: string | null;
  status: (typeof BULK_STATUS)[keyof typeof BULK_STATUS];
}
export interface OccupancyCount {
  occupied: number;
  total: number;
  percent: number;
}
export interface OccupancySnapshot {
  units: OccupancyCount;
  beds: OccupancyCount;
}
export interface UnitChange {
  organizationId: string;
  propertyId: string;
  unitId?: string;
  bedId?: string;
  previousStatus?: UnitStatus;
  status?: UnitStatus;
}
