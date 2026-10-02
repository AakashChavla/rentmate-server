import {
  PasswordService,
  TEST_ARGON2_OPTIONS,
  assertPasswordPolicy,
} from '../services/password.service';

describe('PasswordService', () => {
  const passwords = new PasswordService(TEST_ARGON2_OPTIONS);

  it('verifies a password hashed with argon2id', async () => {
    const hash = await passwords.hash('CorrectHorse1');

    expect(hash.startsWith('$argon2id$')).toBe(true);
    await expect(passwords.verify(hash, 'CorrectHorse1')).resolves.toBe(true);
    await expect(passwords.verify(hash, 'WrongHorse1')).resolves.toBe(false);
  });

  it('runs a dummy verification when the user has no password hash', async () => {
    await expect(passwords.verify(null, 'CorrectHorse1')).resolves.toBe(false);
  });

  it('rejects passwords that miss the policy', () => {
    expect(() => assertPasswordPolicy('short1')).toThrow(/10/);
    expect(() => assertPasswordPolicy('longenough')).toThrow(/letter and a number/);
    expect(() => assertPasswordPolicy('CorrectHorse1')).not.toThrow();
  });
});
