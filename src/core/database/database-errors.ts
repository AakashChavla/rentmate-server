export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if ('code' in error && error.code === UNIQUE_VIOLATION) return true;
  return (
    'driverError' in error &&
    !!error.driverError &&
    typeof error.driverError === 'object' &&
    'code' in error.driverError &&
    error.driverError.code === UNIQUE_VIOLATION
  );
}
const UNIQUE_VIOLATION = '23505';
