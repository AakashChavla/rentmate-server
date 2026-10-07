import { chmod, mkdir, open, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import {
  FILE_LIMIT as F,
  FILE_MIME as M,
  FILE_MAGIC as H,
  STORAGE_LIMIT as B,
} from '../../shared/lease.constants';
import { AppException } from '../../core/errors/app-exception';
import { ErrorCode } from '../../core/errors/error-code.constants';
import type { StoredFile } from './file-storage.contract';
export function sniff(header: Buffer): string | null {
  if (header.subarray(0, H.PDF.length).equals(Buffer.from(H.PDF))) return M.PDF;
  if (header.subarray(0, H.PNG.length).equals(Buffer.from(H.PNG))) return M.PNG;
  if (header.subarray(0, H.JPEG.length).equals(Buffer.from(H.JPEG))) return M.JPEG;
  return null;
}
export async function stageUpload(
  source: AsyncIterable<Uint8Array>,
  mime: string,
  directory: string,
): Promise<StoredFile & { path: string }> {
  await mkdir(directory, { recursive: true, mode: B.DIRECTORY_MODE });
  await chmod(directory, B.DIRECTORY_MODE);
  const key = randomBytes(F.KEY_BYTES).toString('hex'),
    path = join(directory, key);
  const file = await open(path, 'wx', B.FILE_MODE),
    hash = createHash('sha256');
  let size = 0,
    header = Buffer.alloc(0);
  let success = false;
  try {
    for await (const chunk of source) {
      size += chunk.byteLength;
      if (size > F.BYTES) throw new AppException(ErrorCode.DOCUMENT_TOO_LARGE);
      hash.update(chunk);
      if (header.length < F.HEADER)
        header = Buffer.concat([header, Buffer.from(chunk)]).subarray(0, F.HEADER);
      await file.writeFile(chunk);
    }
    if (!size || sniff(header) !== mime) throw new AppException(ErrorCode.DOCUMENT_MIME_INVALID);
    success = true;
    return { key, path, mime, size, checksum: hash.digest('hex') };
  } finally {
    await file.close();
    if (!success) await rm(path, { force: true });
  }
}
