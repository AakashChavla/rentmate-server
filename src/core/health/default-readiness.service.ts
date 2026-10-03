import { Inject, Injectable } from '@nestjs/common';
import { DatabaseConnection } from '../database/database-connection.contract';
import { KeyValueStore } from '../redis/key-value-store.contract';
import { Readiness } from './readiness.contract';
import { HEALTH_STATUS } from '../config/config.constants';
import { AppException } from '../errors/app-exception';
import { ErrorCode } from '../errors/error-code.constants';
@Injectable()
export class DefaultReadiness extends Readiness {
  public constructor(
    @Inject(DatabaseConnection) private readonly db: DatabaseConnection,
    @Inject(KeyValueStore) private readonly store: KeyValueStore,
  ) {
    super();
  }
  public override async check(): Promise<{ status: string; postgres: boolean; redis: boolean }> {
    const [db, redis] = await Promise.allSettled([this.db.ready(), this.store.ping()]);
    const postgres = db.status === FULFILLED && db.value;
    const cache = redis.status === FULFILLED && redis.value;
    if (!postgres || !cache) throw new AppException(ErrorCode.INFRASTRUCTURE_UNAVAILABLE);
    return { status: HEALTH_STATUS.OK, postgres, redis: cache };
  }
}
const FULFILLED = 'fulfilled';
