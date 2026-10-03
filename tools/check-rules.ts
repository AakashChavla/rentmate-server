// Intentionally JavaScript-compatible TypeScript: M0 requires no installed dependencies.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const required = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.agent/rules/core.md',
  '.cursor/rules/core.mdc', '.github/copilot-instructions.md',
  '.github/instructions/source.instructions.md', '.github/pull_request_template.md'];
const docs = Array.from({ length: 11 }, (_, index) => String(index + 1).padStart(2, '0'));
const failures = [];
const guide = path.join(root, 'docs/ai');
const existing = fs.existsSync(guide) ? fs.readdirSync(guide) : [];
for (const prefix of docs) {
  if (!existing.some((name) => name.startsWith(`${prefix}-`) && name.endsWith('.md'))) {
    failures.push(`Missing documentation section ${prefix}`);
  }
}
for (const relative of required) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) { failures.push(`Missing pointer: ${relative}`); continue; }
  const content = fs.readFileSync(target, 'utf8');
  if (content.length > 10000) failures.push(`Rule exceeds 10000 characters: ${relative}`);
  if (relative === 'CLAUDE.md' && content.split('\n')[0] !== '@AGENTS.md') {
    failures.push('CLAUDE.md must begin with @AGENTS.md');
  }
  for (const match of content.matchAll(/(?:docs\/ai\/[\w-]+\.md|AGENTS\.md)/g)) {
    if (!fs.existsSync(path.join(root, match[0]))) failures.push(`Broken reference: ${match[0]}`);
  }
}
function inspect(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) { inspect(target); continue; }
    const content = fs.readFileSync(target, 'utf8');
    if (content.length > 10000) failures.push(`Oversized rule: ${path.relative(root, target)}`);
    for (const match of content.matchAll(/docs\/ai\/[\w-]+\.md/g)) {
      if (!fs.existsSync(path.join(root, match[0]))) failures.push(`Broken reference: ${match[0]}`);
    }
  }
}
for (const directory of ['.agent/rules', '.cursor/rules', '.github/instructions']) {
  inspect(path.join(root, directory));
}
if (failures.length) {
  process.stderr.write(`${failures.join('\n')}\n`);
  process.exitCode = 1;
} else { process.stdout.write('Rules and documentation checks passed.\n'); }
