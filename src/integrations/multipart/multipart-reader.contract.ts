import type { Request } from 'express';
export abstract class MultipartReader {
  public abstract receive<T>(
    req: Request,
    consume: (source: AsyncIterable<Uint8Array>, mime: string) => Promise<T>,
  ): Promise<T>;
}
