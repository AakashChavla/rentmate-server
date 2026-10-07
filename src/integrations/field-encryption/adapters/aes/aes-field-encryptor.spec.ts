import { randomBytes } from 'node:crypto';
import { AesFieldEncryptor } from './aes-field-encryptor';
import { AppConfig } from '../../../../core/config/app-config.contract';
import type { AppEnvironment } from '../../../../core/config/env.schema';
class Config extends AppConfig {
  private readonly values = {
    FIELD_KEY_ID: 'fixture-v1',
    FIELD_KEYS: { 'fixture-v1': randomBytes(32).toString('hex') },
    FIELD_HASH_KEY: randomBytes(32).toString('hex'),
  };
  public override get<K extends keyof AppEnvironment>(key: K): AppEnvironment[K] {
    return this.values[key as keyof typeof this.values] as AppEnvironment[K];
  }
}
it('round trips randomized authenticated encryption, preserves key id and rejects tampering', () => {
  const cipher = new AesFieldEncryptor(new Config());
  const value = '123456789012';
  const a = cipher.encrypt(value),
    b = cipher.encrypt(value);
  expect(a).not.toBe(b);
  expect(a).toContain('.fixture-v1.');
  expect(cipher.decrypt(a)).toBe(value);
  expect(cipher.hash(value)).toBe(cipher.hash(value));
  expect(cipher.hash(value)).not.toBe(value);
  const pieces = a.split('.');
  pieces[3] = randomBytes(16).toString('base64url');
  expect(() => cipher.decrypt(pieces.join('.'))).toThrow();
  expect(() => cipher.decrypt(a.replace('fixture-v1', 'missing'))).toThrow();
});
