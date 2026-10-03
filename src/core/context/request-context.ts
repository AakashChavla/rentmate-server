import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
export interface RequestIdentity {
  requestId: string;
  userId?: string;
  organizationId?: string;
}
@Injectable()
export class RequestContext {
  private readonly storage = new AsyncLocalStorage<RequestIdentity>();
  public run<T>(identity: RequestIdentity, action: () => T): T {
    return this.storage.run(identity, action);
  }
  public current(): RequestIdentity | undefined {
    return this.storage.getStore();
  }
}
