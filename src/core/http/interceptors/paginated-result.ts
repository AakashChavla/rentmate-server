import type { PageInfo } from '../interfaces/api-response';

/** Return this from a handler to lift `page` into the response envelope meta. */
export class PaginatedResult<T> {
  constructor(
    public readonly data: T,
    public readonly page: PageInfo,
  ) {}
}
