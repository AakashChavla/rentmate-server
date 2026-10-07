import { Inject, Injectable } from '@nestjs/common';
import { FileStorage, type StoredFile, type SignedFile } from './file-storage.contract';
import { AppConfig } from '../../core/config/app-config.contract';
import { STORAGE_KIND } from '../../shared/lease.constants';
import type { Readable } from 'node:stream';
export abstract class LocalFileStore extends FileStorage {}
export abstract class RemoteFileStore extends FileStorage {}
@Injectable()
export class ConfiguredFileStorage extends FileStorage {
  public constructor(
    @Inject(AppConfig) private readonly config: AppConfig,
    @Inject(LocalFileStore) private readonly local: LocalFileStore,
    @Inject(RemoteFileStore) private readonly remote: RemoteFileStore,
  ) {
    super();
  }
  private target(): FileStorage {
    return this.config.get('FILE_STORAGE') === STORAGE_KIND.S3 ? this.remote : this.local;
  }
  public override put(source: AsyncIterable<Uint8Array>, mime: string): Promise<StoredFile> {
    return this.target().put(source, mime);
  }
  public override remove(key: string): Promise<void> {
    return this.target().remove(key);
  }
  public override sign(key: string): Promise<SignedFile> {
    return this.target().sign(key);
  }
  public override open(key: string, expires: number, signature: string): Promise<Readable> {
    return this.target().open(key, expires, signature);
  }
}
