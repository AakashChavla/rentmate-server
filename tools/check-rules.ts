import { existsSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { listFiles, readText } from './file-utils';
const MAX_RULE_CHARACTERS = 10_000;
const ROOT = process.cwd();
const POINTERS = [
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  '.agent/rules/core.md',
  '.cursor/rules/core.mdc',
  '.cursor/rules/source.mdc',
  '.github/copilot-instructions.md',
  '.github/instructions/source.instructions.md',
  '.github/pull_request_template.md',
];
const SECTIONS = [
  '01-architecture',
  '02-code-style-and-naming',
  '03-data-access-and-tenancy',
  '04-integrations',
  '05-api-conventions',
  '06-testing',
  '07-security-and-logging',
  '08-git-and-workflow',
  '09-review-checklist',
  '10-roadmap-and-status',
  '11-reusable-catalog',
  '12-localization',
];
const DIRECTORIES = ['.agent/rules', '.cursor/rules', '.github/instructions'];
function inspectPointer(target: string): string[] {
  if (!existsSync(target)) return [`Missing pointer: ${relative(ROOT, target)}`];
  const content = readText(target);
  const errors = content.length > MAX_RULE_CHARACTERS ? [`Oversized rule: ${target}`] : [];
  for (const reference of content.matchAll(/(?:docs\/ai\/[\w-]+\.md|AGENTS\.md)/g)) {
    if (!existsSync(join(ROOT, reference[0]))) errors.push(`Broken reference: ${reference[0]}`);
  }
  if (basename(target) === 'CLAUDE.md' && content.split(/\r?\n/)[0] !== '@AGENTS.md') {
    errors.push('CLAUDE.md must begin with @AGENTS.md');
  }
  return errors;
}
function validateRules(): string[] {
  const files = new Set(POINTERS.map((pointer) => join(ROOT, pointer)));
  for (const directory of DIRECTORIES) {
    if (existsSync(directory))
      listFiles(directory).forEach((target) => files.add(join(ROOT, target)));
  }
  const errors = [...files].flatMap(inspectPointer);
  const sections = ROOT.endsWith('rentmate-client')
    ? [...SECTIONS, '13-design-system-and-motion']
    : SECTIONS;
  for (const section of sections) {
    if (!existsSync(join(ROOT, 'docs/ai', `${section}.md`)))
      errors.push(`Missing section: ${section}`);
  }
  return errors;
}
const errors = validateRules();
if (errors.length) {
  process.stderr.write(`${errors.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('Rules and documentation checks passed.\n');
}
