import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
export function withFixtures<T>(files: Record<string, string | undefined>, action: () => T): T {
  const originals = new Map<string, Buffer | undefined>();
  try {
    for (const [target, content] of Object.entries(files)) {
      originals.set(target, existsSync(target) ? readFileSync(target) : undefined);
      if (content === undefined) {
        if (existsSync(target)) unlinkSync(target);
      } else {
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, content);
      }
    }
    return action();
  } finally {
    for (const [target, content] of originals) {
      if (content === undefined) {
        if (existsSync(target)) unlinkSync(target);
      } else {
        writeFileSync(target, content);
      }
    }
  }
}
export function runNode(
  script: string,
  args: string[] = [],
): { status: number | null; output: string } {
  const result = spawnSync(process.execPath, [resolve(script), ...args], { encoding: 'utf8' });
  return { status: result.status, output: result.stdout + result.stderr };
}
export function requireRejection(
  name: string,
  command: () => { status: number | null; output: string },
  diagnostic: string,
): void {
  const result = command();
  assert.equal(
    result.status,
    1,
    `${name}: expected failure, received ${String(result.status)}: ${result.output}`,
  );
  assert.ok(
    result.output.includes(diagnostic),
    `${name}: missing diagnostic ${diagnostic}: ${result.output}`,
  );
  process.stdout.write(`PASS ${name}\n`);
}
export function runTool(name: string): { status: number | null; output: string } {
  return runNode('node_modules/tsx/dist/cli.mjs', [`tools/${name}.ts`]);
}
