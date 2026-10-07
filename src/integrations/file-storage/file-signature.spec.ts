import { fileSignature, validSignature } from './file-signature';
import { sniff } from './upload-stage';
it('checks short lived signatures, key binding and expiration', () => {
  const key = 'random-private-key',
    secret = 'test-secret',
    expires = 120000,
    signature = fileSignature(key, expires, secret);
  expect(validSignature(key, expires, signature, secret, 0)).toBe(true);
  expect(validSignature(key, expires, signature, secret, expires)).toBe(false);
  expect(validSignature('other', expires, signature, secret, 0)).toBe(false);
  expect(validSignature(key, expires, 'wrong', secret, 0)).toBe(false);
});
it('sniffs magic bytes rather than extensions or declared content type', () => {
  expect(sniff(Buffer.from('%PDF-1.7'))).toBe('application/pdf');
  expect(sniff(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe('image/png');
  expect(sniff(Buffer.from('<script>'))).toBeNull();
  expect(sniff(Buffer.alloc(0))).toBeNull();
});
