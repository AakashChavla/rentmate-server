import { withFixtures, runTool, requireRejection } from './proof-utils';
export function provePointers(): void {
  const cases = [
    {
      name: 'missing pointer',
      target: 'GEMINI.md',
      content: undefined,
      diagnostic: 'Missing pointer',
    },
    {
      name: 'oversized charter',
      target: 'AGENTS.md',
      content: 'x'.repeat(10001),
      diagnostic: 'Oversized rule',
    },
    {
      name: 'oversized scoped rule',
      target: '.cursor/rules/proof.mdc',
      content: 'x'.repeat(10001),
      diagnostic: 'Oversized rule',
    },
    {
      name: 'broken pointer',
      target: '.agent/rules/proof.md',
      content: 'docs/ai/nonexistent.md',
      diagnostic: 'Broken reference',
    },
    {
      name: 'missing section',
      target: 'docs/ai/09-review-checklist.md',
      content: undefined,
      diagnostic: 'Missing section',
    },
    {
      name: 'Claude first line',
      target: 'CLAUDE.md',
      content: 'Invalid\n',
      diagnostic: 'CLAUDE.md must begin',
    },
  ];
  for (const test of cases)
    withFixtures({ [test.target]: test.content }, () => {
      requireRejection(test.name, () => runTool('check-rules'), test.diagnostic);
    });
}
