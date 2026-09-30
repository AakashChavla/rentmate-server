import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route as anonymous. The auth guard will honor this in a later phase. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
