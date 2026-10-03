const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
function run() {
  return spawnSync(process.execPath, ['tools/check-rules.ts'], { cwd: root, encoding: 'utf8' });
}
function prove(name, relative, content, expected) {
  const target = path.join(root, relative);
  const original = fs.existsSync(target) ? fs.readFileSync(target) : undefined;
  try {
    if (content === undefined) fs.unlinkSync(target);
    else fs.writeFileSync(target, content);
    const result = run();
    assert.equal(result.status, 1, `${name}: expected rejection`);
    assert.match(result.stderr, expected, `${name}: expected specific diagnostic`);
    process.stdout.write(`PASS ${name}\n`);
  } finally {
    if (original !== undefined) fs.writeFileSync(target, original);
    else if (fs.existsSync(target)) fs.unlinkSync(target);
  }
}
assert.equal(run().status, 0, 'Baseline rules must pass');
prove('missing required pointer', 'GEMINI.md', undefined, /Missing pointer: GEMINI.md/);
prove('oversized canonical rules', 'AGENTS.md', 'x'.repeat(10001), /Rule exceeds 10000/);
prove('oversized glob rule', '.cursor/rules/proof.mdc', 'x'.repeat(10001), /Oversized rule/);
prove('broken document reference', '.agent/rules/proof.md', 'docs/ai/nonexistent.md', /Broken reference/);
prove('missing documentation section', 'docs/ai/09-review-checklist.md', undefined, /Missing documentation section 09/);
prove('invalid Claude pointer', 'CLAUDE.md', 'Invalid first line\n', /CLAUDE.md must begin/);
assert.equal(run().status, 0, 'Rules must pass after fixture cleanup');
process.stdout.write('All temporary rule violations were rejected and removed.\n');
