import { mkdtemp, readdir, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stageUpload } from './upload-stage';
import { FILE_LIMIT } from '../../shared/lease.constants';
it('bounds streamed uploads and removes the failed private staging file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rentmate-upload-test-'));
  async function* oversized(): AsyncGenerator<Uint8Array> {
    yield await Promise.resolve(Buffer.alloc(FILE_LIMIT.BYTES));
    yield Buffer.from('overflow');
  }
  try {
    await expect(stageUpload(oversized(), 'application/pdf', directory)).rejects.toMatchObject({
      code: 'DOCUMENT_TOO_LARGE',
    });
    expect(await readdir(directory)).toEqual([]);
  } finally {
    await rmdir(directory);
  }
});
