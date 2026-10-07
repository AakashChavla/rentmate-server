import { Inject, Injectable } from '@nestjs/common';
import { LeaseSweep } from './lease-sweep.contract';
import { DatabaseConnection } from '../../core/database/database-connection.contract';
import { LEASE_SWEEP_LOCK } from '../../shared/lease.constants';
@Injectable()
export class TypeOrmLeaseSweep extends LeaseSweep {
  public constructor(@Inject(DatabaseConnection) private readonly db: DatabaseConnection) {
    super();
  }
  public override tryLock(): Promise<boolean> {
    return this.db.withManager(
      async (m) =>
        (
          await m.query<{ locked: boolean }[]>('SELECT pg_try_advisory_xact_lock($1) AS locked', [
            LEASE_SWEEP_LOCK,
          ])
        )[0]?.locked ?? false,
    );
  }
}
