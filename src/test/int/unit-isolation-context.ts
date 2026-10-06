import type { FixtureAccount } from '../e2e/identity-fixture';
import type { UnitRecord, FloorRecord, BedRecord, BulkRecord } from '../../shared/unit.types';
import type { TransactionRunner } from '../../core/database/transaction-runner.contract';
import type { UnitRepository, FloorRepository, BulkJobRepository } from '../../modules/units';
import type { BedRepository } from '../../modules/beds';
export interface UnitIsolationContext {
  owner: FixtureAccount;
  org: string;
  foreign: string;
  property: string;
  unit: UnitRecord;
  floor: FloorRecord;
  bed: BedRecord;
  job: BulkRecord;
  units: UnitRepository;
  floors: FloorRepository;
  beds: BedRepository;
  jobs: BulkJobRepository;
  tx: TransactionRunner;
}
export const UNIT_INPUT = {
  code: 'Fixture',
  type: 'ROOM',
  baseRent: '500.00',
  capacity: 2,
} as const;
export const BULK_INPUT = {
  floors: 1,
  perFloor: 1,
  prefix: 'B',
  startFloor: 1,
  startNumber: 1,
  wing: '',
  type: 'ROOM',
  baseRent: '0.00',
  capacity: 1,
} as const;
export const UNIT_CONFIG = { amenities: [], size: null, furnishing: 'UNFURNISHED' } as const;
