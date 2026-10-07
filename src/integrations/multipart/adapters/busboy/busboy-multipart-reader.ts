import { Injectable } from '@nestjs/common';
import busboy from 'busboy';
import type { Request } from 'express';
import type { Readable } from 'node:stream';
import { MultipartReader } from '../../multipart-reader.contract';
import { FILE_LIMIT as F, STORAGE_LIMIT as B } from '../../../../shared/lease.constants';
import { AppException } from '../../../../core/errors/app-exception';
import { ErrorCode } from '../../../../core/errors/error-code.constants';
async function* limited(stream: Readable & { truncated?: boolean }): AsyncGenerator<Uint8Array> {
  for await (const chunk of stream) {
    if (!Buffer.isBuffer(chunk)) throw new AppException(ErrorCode.VALIDATION_ERROR);
    yield chunk;
  }
  if (stream.truncated) throw new AppException(ErrorCode.DOCUMENT_TOO_LARGE);
}
@Injectable()
export class BusboyMultipartReader extends MultipartReader {
  public override receive<T>(
    req: Request,
    consume: (source: AsyncIterable<Uint8Array>, mime: string) => Promise<T>,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let used = false;
      let parser: ReturnType<typeof busboy>;
      try {
        parser = busboy({
          headers: req.headers,
          limits: { fileSize: F.BYTES, files: 1, fields: 0, parts: 1 },
        });
      } catch {
        reject(new AppException(ErrorCode.VALIDATION_ERROR));
        return;
      }
      const timer = setTimeout(() => {
        parser.destroy(new AppException(ErrorCode.VALIDATION_ERROR));
      }, B.TIMEOUT_MS);
      parser.on('file', (_name, stream, info) => {
        used = true;
        void consume(limited(stream), info.mimeType).then(resolve, reject);
      });
      parser.on('error', () => {
        reject(new AppException(ErrorCode.VALIDATION_ERROR));
      });
      parser.on('close', () => {
        clearTimeout(timer);
        if (!used) reject(new AppException(ErrorCode.VALIDATION_ERROR));
      });
      req.on('aborted', () => {
        parser.destroy(new AppException(ErrorCode.VALIDATION_ERROR));
      });
      req.pipe(parser);
    });
  }
}
