import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { isUniqueViolation } from '../../core/database/database-errors';
export async function unitWrite<T>(
  action: () => Promise<T>,
  duplicate: ErrorCode = ErrorCode.CONFLICT,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (isUniqueViolation(error)) throw new AppException(duplicate);
    throw error;
  }
}
