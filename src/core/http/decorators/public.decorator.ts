import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route as anonymous. The JWT guard skips these handlers. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Opts a single handler back into authentication when the controller is public. */
export const Authenticated = () => SetMetadata(IS_PUBLIC_KEY, false);
