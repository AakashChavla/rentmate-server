import type { Readable } from 'node:stream';
export interface StoredFile {
  key: string;
  mime: string;
  size: number;
  checksum: string;
}
export interface SignedFile {
  url: string | null;
  expires: number;
  signature: string;
}
export abstract class FileStorage {
  public abstract put(source: AsyncIterable<Uint8Array>, mime: string): Promise<StoredFile>;
  public abstract remove(key: string): Promise<void>;
  public abstract sign(key: string): Promise<SignedFile>;
  public abstract open(key: string, expires: number, signature: string): Promise<Readable>;
}
export abstract class AntivirusScanner {
  public abstract scan(path: string): Promise<void>;
}
