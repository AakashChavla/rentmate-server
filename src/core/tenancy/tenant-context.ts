import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContextStore {
  requestId?: string;
  organizationId?: string;
  userId?: string;
}

export interface VerifiedIdentity {
  organizationId: string;
  userId: string;
}

/**
 * Request-scoped tenancy state. The auth phase will call `setVerifiedIdentity`
 * from a verified JWT only. Organization id is never taken from the body,
 * query, or route params.
 */
class TenantContextStoreAccess {
  private readonly storage = new AsyncLocalStorage<TenantContextStore>();

  run<T>(store: TenantContextStore, fn: () => T): T {
    return this.storage.run({ ...store }, fn);
  }

  setVerifiedIdentity(identity: VerifiedIdentity): void {
    const store = this.storage.getStore();
    if (!store) {
      throw new Error('TenantContext is not active');
    }

    store.organizationId = identity.organizationId;
    store.userId = identity.userId;
  }

  getOrganizationId(): string | undefined {
    return this.storage.getStore()?.organizationId;
  }

  getUserId(): string | undefined {
    return this.storage.getStore()?.userId;
  }

  getRequestId(): string | undefined {
    return this.storage.getStore()?.requestId;
  }
}

export const TenantContext = new TenantContextStoreAccess();
