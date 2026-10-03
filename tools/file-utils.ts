import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
export function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(target) : [target];
  });
}
export function readText(target: string): string {
  return readFileSync(target, 'utf8');
}
