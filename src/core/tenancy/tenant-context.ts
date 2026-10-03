import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { INTERNAL_MESSAGES } from '../config/config.constants';
@Injectable()
export class TenantContext {
  private readonly storage = new AsyncLocalStorage<string>();
  public run<T>(organizationId: string, action: () => T): T {
    if (!organizationId) throw new Error(INTERNAL_MESSAGES.TENANT_REQUIRED);
    return this.storage.run(organizationId, action);
  }
  public require(): string {
    const id = this.storage.getStore();
    if (!id) throw new Error(INTERNAL_MESSAGES.TENANT_REQUIRED);
    return id;
  }
}
