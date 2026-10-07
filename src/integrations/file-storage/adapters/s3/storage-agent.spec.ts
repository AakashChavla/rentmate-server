import { publicStorageAddress, storageEndpoint } from './storage-agent';
it.each([
  '127.0.0.1',
  '10.0.0.1',
  '172.16.0.1',
  '192.168.0.1',
  '169.254.169.254',
  '100.64.0.1',
  '::1',
  '::ffff:127.0.0.1',
  'fc00::1',
  'fe80::1',
  '2001:db8::1',
])('rejects private or reserved storage address %s', (address) => {
  expect(publicStorageAddress(address)).toBe(false);
});
it.each([
  'http://public.example',
  'https://127.0.0.1',
  'https://[::1]',
  'https://user:pass@public.example',
])('rejects unsafe endpoint %s', (endpoint) => {
  expect(() => storageEndpoint(endpoint)).toThrow();
});
it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])(
  'allows public storage address %s',
  (address) => {
    expect(publicStorageAddress(address)).toBe(true);
  },
);
