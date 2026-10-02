import { ErrorCode } from '../errors/error-codes';

export class TenantScopeError extends Error {
  readonly code = ErrorCode.TENANT_SCOPE_MISSING;

  constructor(message = 'organizationId is required for tenant-scoped data access') {
    super(message);
    this.name = 'TenantScopeError';
  }
}

export class TenantScopeMissingError extends TenantScopeError {}
