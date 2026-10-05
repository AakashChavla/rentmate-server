import { CryptoInvitationToken } from './crypto-invitation-token';
it('generates random 32-byte tokens, stores only SHA256 and compares equal-sized digests', () => {
  const crypto = new CryptoInvitationToken();
  const token = crypto.generate();
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  expect(crypto.generate()).not.toBe(token);
  const digest = crypto.digest(token);
  expect(digest).toHaveLength(64);
  expect(digest).not.toBe(token);
  expect(crypto.matches(token, digest)).toBe(true);
  expect(crypto.matches('wrong', digest)).toBe(false);
  expect(crypto.matches(token, 'invalid')).toBe(false);
});
