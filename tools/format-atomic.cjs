const fs = require('node:fs');
const path = require('node:path');
const prettier = require('prettier');
const excluded = new Set([
  'node_modules',
  '.git',
  '.next',
  '.cache',
  '.yarn',
  'dist',
  'coverage',
  '.codex',
  '.agents',
  '.aws',
]);
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? (excluded.has(entry.name) ? [] : files(file)) : [file];
  });
}
async function format() {
  for (const file of files('.')) {
    const info = await prettier.getFileInfo(file, { ignorePath: '.prettierignore' });
    if (info.ignored || !info.inferredParser) continue;
    const input = fs.readFileSync(file, 'utf8');
    const output = await prettier.format(input, {
      ...(await prettier.resolveConfig(file)),
      filepath: file,
    });
    if (input === output) continue;
    const temporary = `${file}.format-${process.pid}`;
    try {
      fs.writeFileSync(temporary, output);
      fs.renameSync(temporary, file);
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }
  process.stdout.write('Prettier formatting completed using atomic file replacement.\n');
}
void format().catch(() => {
  process.stderr.write('Formatting failed.\n');
  process.exitCode = 1;
});
