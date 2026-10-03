import { listFiles, readText } from './file-utils';
import { allowedAuthScopeUsage } from './auth-scope-policy';
for (const path of listFiles('src'))
  if (path.endsWith('.ts') && !allowedAuthScopeUsage(path, readText(path)))
    throw new Error(`Auth escape hatch outside auth repository: ${path}`);
process.stdout.write('Auth escape hatch locations passed.\n');
