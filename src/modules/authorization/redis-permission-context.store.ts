import { Injectable, Inject } from '@nestjs/common';
import { KeyValueStore } from '../../core/redis/key-value-store.contract';
import { PermissionContextStore } from './permission.contract';
import { IDENTITY_KEYS as K, IDENTITY_TTL as T } from '../../shared/identity.constants';
import type { PermissionContext } from '../../shared/identity.types';
import { IdGenerator } from '../../core/ids/id-generator.contract';
@Injectable()
export class RedisPermissionContextStore extends PermissionContextStore {
  public constructor(
    @Inject(KeyValueStore) private readonly store: KeyValueStore,
    @Inject(IdGenerator) private readonly ids: IdGenerator,
  ) {
    super();
  }
  public override async version(org: string, user: string): Promise<string> {
    return (await this.store.get(K.contextVersion(org, user))) ?? INITIAL_VERSION;
  }
  public override async get(org: string, user: string): Promise<PermissionContext | null> {
    const [value, version] = await Promise.all([
      this.store.get(K.context(org, user)),
      this.version(org, user),
    ]);
    if (!value) return null;
    const record = JSON.parse(value) as { context: PermissionContext; version: string };
    return record.version === version ? record.context : null;
  }
  public override set(
    org: string,
    user: string,
    context: PermissionContext,
    version: string,
  ): Promise<boolean> {
    return this.store.setIfCurrent(
      K.context(org, user),
      JSON.stringify({ context, version }),
      T.CONTEXT,
      K.contextVersion(org, user),
      version,
    );
  }
  public override async invalidate(org: string, user: string): Promise<void> {
    await this.store.set(K.contextVersion(org, user), this.ids.next(), T.CONTEXT + T.ACCESS);
    await this.store.delete(K.context(org, user));
  }
}
const INITIAL_VERSION = '0';
