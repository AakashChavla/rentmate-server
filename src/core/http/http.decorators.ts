import { SetMetadata } from '@nestjs/common';
export const HTTP_METADATA = { PUBLIC: 'rm.public', SKIP_ENVELOPE: 'rm.skip-envelope' } as const;
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(HTTP_METADATA.PUBLIC, true);
export const SkipEnvelope = (): MethodDecorator & ClassDecorator =>
  SetMetadata(HTTP_METADATA.SKIP_ENVELOPE, true);
