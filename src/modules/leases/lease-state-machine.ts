import { LEASE_STATUS as S } from '../../shared/lease.constants';
import type { LeaseStatus } from '../../shared/lease.types';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
export const LEASE_TRANSITIONS: Record<LeaseStatus, readonly LeaseStatus[]> = {
  [S.PENDING]: [S.ACTIVE, S.EXPIRED, S.TERMINATED],
  [S.ACTIVE]: [S.EXPIRING, S.EXPIRED, S.RENEWED, S.TERMINATED],
  [S.EXPIRING]: [S.EXPIRED, S.RENEWED, S.TERMINATED],
  [S.EXPIRED]: [],
  [S.RENEWED]: [S.EXPIRED, S.TERMINATED],
  [S.TERMINATED]: [],
};
export class LeaseStateMachine {
  public transition(from: LeaseStatus, to: LeaseStatus): LeaseStatus {
    if (from === to) return to;
    if (!LEASE_TRANSITIONS[from].includes(to))
      throw new AppException(ErrorCode.ILLEGAL_LEASE_TRANSITION);
    return to;
  }
}
