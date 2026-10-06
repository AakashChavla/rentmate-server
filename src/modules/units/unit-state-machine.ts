import { STATUS_TRANSITIONS } from '../../shared/unit.constants';
import type { UnitStatus, StatusInput } from '../../shared/unit.types';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
export class UnitStateMachine {
  public transition(current: UnitStatus, input: StatusInput): UnitStatus {
    if (input.expectedStatus && input.expectedStatus !== current)
      throw new AppException(ErrorCode.STALE_UNIT_STATUS);
    if (input.status !== current && !STATUS_TRANSITIONS[current].includes(input.status))
      throw new AppException(ErrorCode.ILLEGAL_UNIT_TRANSITION);
    return input.status;
  }
}
