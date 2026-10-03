import { withFixtures, requireRejection, runTool } from './proof-utils';
export function proveAuthScope(): void {
  withFixtures(
    {
      'src/modules/proof/services/escape.service.ts':
        'export const unauthorized = database.unscopedForAuth(reason);',
    },
    () => {
      requireRejection(
        'auth scope escape outside auth',
        () => runTool('check-auth-scope'),
        'Auth escape hatch outside auth repository',
      );
    },
  );
}
