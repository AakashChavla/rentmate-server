import { readCatalog, placeholders, SUPPORTED_LOCALES } from './catalog-utils';
import { usedKeys } from './translation-usage';
function compareLocale(locale: string, baseline: Record<string, string>): string[] {
  const actual = readCatalog(locale);
  const errors: string[] = [];
  for (const [key, value] of Object.entries(baseline)) {
    const translated = actual[key];
    if (translated === undefined) errors.push(`Missing key: ${locale}:${key}`);
    else if (placeholders(value) !== placeholders(translated))
      errors.push(`Placeholder mismatch: ${locale}:${key}`);
  }
  for (const key of Object.keys(actual)) {
    if (!(key in baseline)) errors.push(`Extra key: ${locale}:${key}`);
  }
  return errors;
}
function checkCatalogs(): string[] {
  const baseline = readCatalog('en');
  const used = usedKeys();
  const errors = SUPPORTED_LOCALES.flatMap((locale) => compareLocale(locale, baseline));
  for (const key of Object.keys(baseline)) {
    if (!used.has(key)) errors.push(`Unused key: ${key}`);
  }
  for (const key of used) {
    if (!(key in baseline)) errors.push(`Unknown translation key: ${key}`);
  }
  return errors;
}
const errors = checkCatalogs();
if (errors.length) {
  process.stderr.write(`${errors.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('Localization parity, placeholders and usage passed.\n');
}
