import { Inject, Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createReadStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import {
  FileStorage,
  AntivirusScanner,
  type StoredFile,
  type SignedFile,
} from '../../file-storage.contract';
import { stageUpload } from '../../upload-stage';
import { AppConfig } from '../../../../core/config/app-config.contract';
import { Clock } from '../../../../core/time/clock.contract';
import { ExternalCallPolicy } from '../../../../core/outbound/external-call-policy.contract';
import { AppException } from '../../../../core/errors/app-exception';
import { ErrorCode } from '../../../../core/errors/error-code.constants';
import { FILE_LIMIT as F, STORAGE_LIMIT as B } from '../../../../shared/lease.constants';
import { storageAgent, storageEndpoint } from './storage-agent';

@Injectable()
export class S3FileStorage extends FileStorage {
  public constructor(
    @Inject(AppConfig) private readonly config: AppConfig,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(AntivirusScanner) private readonly scanner: AntivirusScanner,
    @Inject(ExternalCallPolicy) private readonly calls: ExternalCallPolicy,
  ) {
    super();
  }
  private client(): S3Client {
    const endpoint = storageEndpoint(this.config.get('S3_ENDPOINT'));
    return new S3Client({
      region: this.config.get('S3_REGION'),
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      ...(this.config.get('S3_ACCESS_KEY')
        ? {
            credentials: {
              accessKeyId: this.config.get('S3_ACCESS_KEY') ?? '',
              secretAccessKey: this.config.get('S3_SECRET_KEY') ?? '',
            },
          }
        : {}),
      maxAttempts: 1,
      requestHandler: {
        httpsAgent: storageAgent(),
        connectionTimeout: B.TIMEOUT_MS,
        requestTimeout: B.TIMEOUT_MS,
      },
    });
  }
  private bucket(): string {
    const bucket = this.config.get('S3_BUCKET');
    if (!bucket) throw new AppException(ErrorCode.INFRASTRUCTURE_UNAVAILABLE);
    return bucket;
  }
  private async call<T>(action: (client: S3Client, signal: AbortSignal) => Promise<T>): Promise<T> {
    const client = this.client(),
      abort = new AbortController();
    try {
      return await this.calls.run(() => action(client, abort.signal), {
        timeoutMs: B.TIMEOUT_MS,
        attempts: 1,
        onTimeout: () => {
          abort.abort();
        },
      });
    } finally {
      client.destroy();
    }
  }
  public override async put(source: AsyncIterable<Uint8Array>, mime: string): Promise<StoredFile> {
    const file = await stageUpload(source, mime, join(tmpdir(), 'rentmate-private-s3'));
    try {
      await this.scanner.scan(file.path);
      await this.call((client, signal) =>
        client.send(
          new PutObjectCommand({
            Bucket: this.bucket(),
            Key: file.key,
            Body: createReadStream(file.path),
            ContentType: mime,
            ContentLength: file.size,
            ServerSideEncryption: 'AES256',
          }),
          { abortSignal: signal },
        ),
      );
      return { key: file.key, mime, size: file.size, checksum: file.checksum };
    } finally {
      await rm(file.path, { force: true });
    }
  }
  public override async remove(key: string): Promise<void> {
    await this.call((client, signal) =>
      client.send(new DeleteObjectCommand({ Bucket: this.bucket(), Key: key }), {
        abortSignal: signal,
      }),
    );
  }
  public override async sign(key: string): Promise<SignedFile> {
    const url = await this.call((client) =>
      getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: this.bucket(),
          Key: key,
          ResponseContentDisposition: 'attachment',
        }),
        { expiresIn: F.URL_TTL_MS / B.SECOND_MS },
      ),
    );
    return { url, expires: this.clock.now().getTime() + F.URL_TTL_MS, signature: '' };
  }
  public override open(_key: string, _expires: number, _signature: string): Promise<Readable> {
    throw new AppException(ErrorCode.NOT_FOUND);
  }
}
