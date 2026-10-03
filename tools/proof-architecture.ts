import { ARCHITECTURE_PROOFS } from './architecture-fixtures';
import { withFixtures, runNode, requireRejection } from './proof-utils';
export function proveArchitecture(): void {
  for (const test of ARCHITECTURE_PROOFS)
    withFixtures(test.files, () => {
      requireRejection(
        test.name,
        () =>
          runNode('node_modules/dependency-cruiser/bin/dependency-cruise.mjs', [
            'src',
            '--config',
            '.dependency-cruiser.cjs',
          ]),
        test.name,
      );
    });
}
