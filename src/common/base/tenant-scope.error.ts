import { ErrorCode } from '../constants/error-codes';

export class TenantScopeMissingError extends Error {
  readonly code = ErrorCode.TENANT_SCOPE_MISSING;

  constructor() {
    super('organizationId is required for tenant-scoped data access');
    this.name = 'TenantScopeMissingError';
  }
}
