import assert from 'node:assert/strict';
import { z } from 'zod';
import { withFixtures, runNode } from './proof-utils';
import { LINT_PROOF, EXPECTED_LINT_RULES } from './proof-fixtures';
const RESULT_SCHEMA = z.array(
  z.object({ messages: z.array(z.object({ ruleId: z.string().nullable(), message: z.string() })) }),
);
export function proveLint(): void {
  const extension = process.cwd().endsWith('rentmate-client') ? 'tsx' : 'ts';
  const target = `src/proof/lint-proof.${extension}`;
  const result = withFixtures({ [target]: LINT_PROOF }, () =>
    runNode('node_modules/eslint/bin/eslint.js', ['--format', 'json', target]),
  );
  assert.equal(result.status, 1, `Expected lint rejection: ${result.output}`);
  const raw: unknown = JSON.parse(result.output);
  const results = RESULT_SCHEMA.parse(raw);
  const fired = new Set(
    results.flatMap((entry) => entry.messages.map((message) => message.ruleId)),
  );
  for (const rule of EXPECTED_LINT_RULES) {
    assert.ok(fired.has(rule), `Lint rule did not fire: ${rule}; fired: ${[...fired].join(', ')}`);
    process.stdout.write(`PASS lint ${rule}\n`);
  }
}
