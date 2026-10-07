import { Inject, Injectable } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import {
  FileStorage,
  AntivirusScanner,
  type StoredFile,
  type SignedFile,
} from '../../file-storage.contract';
import { stageUpload } from '../../upload-stage';
import { fileSignature, validSignature } from '../../file-signature';
import { AppConfig } from '../../../../core/config/app-config.contract';
import { Clock } from '../../../../core/time/clock.contract';
import { AppException } from '../../../../core/errors/app-exception';
import { ErrorCode } from '../../../../core/errors/error-code.constants';
import { FILE_LIMIT as F } from '../../../../shared/lease.constants';
@Injectable()
export class LocalFileStorage extends FileStorage {
  public constructor(
    @Inject(AppConfig) private readonly config: AppConfig,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(AntivirusScanner) private readonly scanner: AntivirusScanner,
  ) {
    super();
  }
  public override async put(source: AsyncIterable<Uint8Array>, mime: string): Promise<StoredFile> {
    const file = await stageUpload(source, mime, resolve(this.config.get('FILE_LOCAL_PATH')));
    try {
      await this.scanner.scan(file.path);
      return { key: file.key, mime: file.mime, size: file.size, checksum: file.checksum };
    } catch (error) {
      await rm(file.path, { force: true });
      throw error;
    }
  }
  public override remove(key: string): Promise<void> {
    return rm(this.path(key), { force: true });
  }
  public override sign(key: string): Promise<SignedFile> {
    const expires = this.clock.now().getTime() + F.URL_TTL_MS;
    return Promise.resolve({
      url: null,
      expires,
      signature: fileSignature(key, expires, this.config.get('OTP_HMAC_SECRET')),
    });
  }
  public override open(key: string, expires: number, signature: string): Promise<Readable> {
    if (
      !validSignature(
        key,
        expires,
        signature,
        this.config.get('OTP_HMAC_SECRET'),
        this.clock.now().getTime(),
      )
    )
      throw new AppException(ErrorCode.DOCUMENT_URL_EXPIRED);
    return Promise.resolve(createReadStream(this.path(key)));
  }
  private path(key: string): string {
    if (!/^[a-f0-9]{64}$/.test(key)) throw new AppException(ErrorCode.NOT_FOUND);
    return join(resolve(this.config.get('FILE_LOCAL_PATH')), key);
  }
}
