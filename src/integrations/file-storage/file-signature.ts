import { createHmac, timingSafeEqual } from 'node:crypto';
import { CRYPTO_FIELD as C } from '../../shared/lease.constants';
export function fileSignature(key: string, expires: number, secret: string): string {
  return createHmac(C.HASH, secret)
    .update(C.URL_DOMAIN + key + ':' + String(expires))
    .digest(C.ENCODING);
}
export function validSignature(
  key: string,
  expires: number,
  signature: string,
  secret: string,
  now: number,
): boolean {
  if (typeof signature !== 'string') return false;
  const expected = Buffer.from(fileSignature(key, expires, secret));
  const actual = Buffer.from(signature);
  return (
    Number.isSafeInteger(expires) &&
    expires > now &&
    actual.length === expected.length &&
    timingSafeEqual(actual, expected)
  );
}
