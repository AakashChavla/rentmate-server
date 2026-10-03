import { allowedAuthScopeUsage } from '../../../tools/auth-scope-policy';
import { listFiles, readText } from '../../../tools/file-utils';
describe('auth scope escape hatch', () => {
  it('fails for usage outside auth repositories', () => {
    expect(
      allowedAuthScopeUsage(
        'src/modules/payments/services/payments.service.ts',
        'lookup.unscopedForAuth(reason)',
      ),
    ).toBe(false);
    expect(
      allowedAuthScopeUsage(
        'src/modules/auth/repositories/login.repository.ts',
        'lookup.unscopedForAuth(reason)',
      ),
    ).toBe(true);
  });
  it('checks every source file for unauthorized usage', () => {
    for (const path of listFiles('src'))
      if (path.endsWith('.ts')) expect(allowedAuthScopeUsage(path, readText(path))).toBe(true);
  });
});
