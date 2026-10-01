import { maskEmail } from '../../../../src/common/utils/mask';

describe('maskEmail', () => {
  it('masks valid email correctly', () => {
    expect(maskEmail('john.doe@example.com')).toBe('j***@example.com');
  });

  it('handles single character local part', () => {
    expect(maskEmail('a@domain.com')).toBe('a***@domain.com');
  });

  it('returns *** for invalid email format', () => {
    expect(maskEmail('invalidemail')).toBe('***');
  });
});
