import * as fs from 'fs';
import * as path from 'path';

const rootDir = path.resolve(__dirname, '..');

function checkFileExists(filePath: string): boolean {
  const fullPath = path.join(rootDir, filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Error: Missing required file: ${filePath}`);
    return false;
  }
  return true;
}

function checkFileLength(filePath: string, maxChars: number = 10000): boolean {
  const fullPath = path.join(rootDir, filePath);
  if (!fs.existsSync(fullPath)) return false;
  const content = fs.readFileSync(fullPath, 'utf8');
  if (content.length > maxChars) {
    console.error(
      `❌ Error: ${filePath} exceeds ${maxChars} characters limit! (Current length: ${content.length} chars)`,
    );
    return false;
  }
  return true;
}

function checkDocReferences(filePath: string): boolean {
  const fullPath = path.join(rootDir, filePath);
  if (!fs.existsSync(fullPath)) return false;
  const content = fs.readFileSync(fullPath, 'utf8');
  const matches = content.match(/docs\/ai\/\d{2}-[a-z-]+\.md/g) || [];
  let valid = true;
  for (const match of matches) {
    const targetDoc = path.join(rootDir, match);
    if (!fs.existsSync(targetDoc)) {
      console.error(`❌ Error: ${filePath} references non-existent doc: ${match}`);
      valid = false;
    }
  }
  return valid;
}

function runChecks(): void {
  console.log('🔍 Checking engineering rulebook integrity...');
  let success = true;

  // 1. Single source of truth & main rules files
  const coreFiles = [
    'AGENTS.md',
    'CLAUDE.md',
    'GEMINI.md',
    '.github/copilot-instructions.md',
    '.github/pull_request_template.md',
    '.editorconfig',
  ];

  for (const f of coreFiles) {
    if (!checkFileExists(f)) success = false;
  }

  // 2. Length limits on rules files (10k chars limit)
  if (!checkFileLength('AGENTS.md', 10000)) success = false;

  // 3. Antigravity rules (.agent/rules/*.md)
  const agentRulesDir = path.join(rootDir, '.agent', 'rules');
  if (fs.existsSync(agentRulesDir)) {
    const files = fs.readdirSync(agentRulesDir).filter((f) => f.endsWith('.md'));
    if (files.length === 0) {
      console.error('❌ Error: No rule files found in .agent/rules/');
      success = false;
    }
    for (const f of files) {
      const relPath = path.join('.agent', 'rules', f);
      if (!checkFileLength(relPath, 10000)) success = false;
      if (!checkDocReferences(relPath)) success = false;
    }
  } else {
    console.error('❌ Error: Directory .agent/rules/ does not exist!');
    success = false;
  }

  // 4. Cursor rules (.cursor/rules/*.mdc)
  const cursorRulesDir = path.join(rootDir, '.cursor', 'rules');
  if (fs.existsSync(cursorRulesDir)) {
    const files = fs.readdirSync(cursorRulesDir).filter((f) => f.endsWith('.mdc'));
    const requiredCursorRules = [
      'core.mdc',
      'repository.mdc',
      'controller.mdc',
      'tests.mdc',
      'migrations.mdc',
      'integrations.mdc',
    ];
    for (const req of requiredCursorRules) {
      if (!files.includes(req)) {
        console.error(`❌ Error: Missing required Cursor rule: .cursor/rules/${req}`);
        success = false;
      }
    }
    for (const f of files) {
      const relPath = path.join('.cursor', 'rules', f);
      if (!checkFileLength(relPath, 10000)) success = false;
      if (!checkDocReferences(relPath)) success = false;
    }
  } else {
    console.error('❌ Error: Directory .cursor/rules/ does not exist!');
    success = false;
  }

  // 5. GitHub Copilot scoped instructions (.github/instructions/*.instructions.md)
  const copilotDir = path.join(rootDir, '.github', 'instructions');
  if (fs.existsSync(copilotDir)) {
    const files = fs.readdirSync(copilotDir).filter((f) => f.endsWith('.instructions.md'));
    const requiredCopilotInstructions = [
      'repository.instructions.md',
      'controller.instructions.md',
      'tests.instructions.md',
      'migrations.instructions.md',
      'integrations.instructions.md',
    ];
    for (const req of requiredCopilotInstructions) {
      if (!files.includes(req)) {
        console.error(
          `❌ Error: Missing required Copilot instruction: .github/instructions/${req}`,
        );
        success = false;
      }
    }
    for (const f of files) {
      const relPath = path.join('.github', 'instructions', f);
      if (!checkFileLength(relPath, 10000)) success = false;
      if (!checkDocReferences(relPath)) success = false;
    }
  } else {
    console.error('❌ Error: Directory .github/instructions/ does not exist!');
    success = false;
  }

  // 6. Check docs/ai/ files existence (01 to 11)
  const requiredAiDocs = [
    'docs/ai/01-architecture.md',
    'docs/ai/02-code-style-and-naming.md',
    'docs/ai/03-data-access-and-tenancy.md',
    'docs/ai/04-integrations.md',
    'docs/ai/05-api-conventions.md',
    'docs/ai/06-testing.md',
    'docs/ai/07-security-and-logging.md',
    'docs/ai/08-git-and-workflow.md',
    'docs/ai/09-review-checklist.md',
    'docs/ai/10-roadmap-and-status.md',
    'docs/ai/11-reusable-catalog.md',
  ];

  for (const doc of requiredAiDocs) {
    if (!checkFileExists(doc)) success = false;
  }

  // 7. Check docs/adr/ files existence (template + 0001 to 0006)
  const requiredAdrs = [
    'docs/adr/template.md',
    'docs/adr/0001-modular-monolith-and-layers.md',
    'docs/adr/0002-ports-and-adapters-for-integrations.md',
    'docs/adr/0003-repository-layer-and-transactions.md',
    'docs/adr/0004-platform-notifications-facade-vs-notifications-module.md',
    'docs/adr/0005-cookie-based-auth-with-session-hint.md',
    'docs/adr/0006-cursor-pagination.md',
  ];

  for (const adr of requiredAdrs) {
    if (!checkFileExists(adr)) success = false;
  }

  // 8. Check pointers in core rule files
  checkDocReferences('AGENTS.md');
  checkDocReferences('CLAUDE.md');
  checkDocReferences('GEMINI.md');
  checkDocReferences('.github/copilot-instructions.md');

  if (!success) {
    console.error('\n❌ Engineering rulebook verification failed!');
    process.exit(1);
  }

  console.log('\n✅ All engineering rulebook checks passed successfully!');
}

runChecks();
