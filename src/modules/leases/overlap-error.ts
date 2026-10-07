import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import { DATABASE_ERROR } from '../../shared/lease.constants';
export function mapLeaseError(error: unknown): never {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
  if (code === DATABASE_ERROR.OVERLAP) throw new AppException(ErrorCode.LEASE_OVERLAP);
  throw error;
}
