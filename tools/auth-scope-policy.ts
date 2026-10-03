export function allowedAuthScopeUsage(path: string, content: string): boolean {
  path = path.replaceAll('\\', '/');
  return (
    !/\bunscopedForAuth\b/.test(content) ||
    path === 'src/core/database/global.repository.ts' ||
    path.startsWith('src/modules/auth/repositories/') ||
    /\.spec\.ts$/.test(path)
  );
}
