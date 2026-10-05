import { join } from 'node:path';
import { z } from 'zod';
import { listFiles, readText } from './file-utils';
const CATALOG_SCHEMA = z.record(z.string(), z.unknown());
export const SUPPORTED_LOCALES = ['en', 'hi'] as const;
export const CATALOG_DIRECTORY = process.cwd().endsWith('rentmate-server')
  ? 'src/i18n'
  : 'messages';
export function readCatalog(locale: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const target of listFiles(join(CATALOG_DIRECTORY, locale))) {
    const namespace = target.split(/[\\/]/).at(-1)?.replace('.json', '');
    const raw: unknown = JSON.parse(readText(target));
    for (const [key, value] of Object.entries(flatCatalog(CATALOG_SCHEMA.parse(raw)))) {
      result[`${namespace ?? ''}.${key}`] = value;
    }
  }
  return result;
}
function flatCatalog(raw: Record<string, unknown>, prefix = ''): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') entries[path] = value;
    else Object.assign(entries, flatCatalog(CATALOG_SCHEMA.parse(value), path));
  }
  return entries;
}
export function placeholders(value: string): string {
  return [...new Set([...value.matchAll(/\{([\w]+)(?:[,}])/g)].map((match) => match[1]))]
    .sort()
    .join(',');
}
