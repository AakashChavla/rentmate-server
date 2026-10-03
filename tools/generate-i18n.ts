import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { readCatalog, SUPPORTED_LOCALES } from './catalog-utils';
const server = process.cwd().endsWith('rentmate-server');
const target = server
  ? 'src/core/i18n/generated/i18n.generated.ts'
  : 'src/lib/i18n/generated/i18n.generated.ts';
const catalog = readCatalog('en');
const namespaces = [...new Set(Object.keys(catalog).map((key) => key.split('.')[0]))].filter(
  (namespace): namespace is string => namespace !== undefined,
);
const imports = SUPPORTED_LOCALES.flatMap((locale) =>
  namespaces.map((namespace, index) => {
    const base = server ? '../../../i18n' : '../../../../messages';
    return `import catalog${String(index)}${locale} from '${base}/${locale}/${namespace}.json';`;
  }),
);
const fields = namespaces
  .map((namespace, index) => `${namespace}: typeof catalog${String(index)}en`)
  .join('; ');
const keys = Object.keys(catalog)
  .map((key) => JSON.stringify(key))
  .join(' | ');
const typeDefinition = `export type I18nTranslations = { ${fields} };\nexport type I18nKey = ${keys};\n`;
const maps = SUPPORTED_LOCALES.map(
  (locale) =>
    `${locale}: { ${namespaces.map((namespace, index) => `${namespace}: catalog${String(index)}${locale}`).join(', ')} }`,
).join(', ');
const catalogMaps = server ? '' : `export const CATALOGS = { ${maps} };\n`;
mkdirSync(dirname(target), { recursive: true });
writeFileSync(
  target,
  `// Generated with yarn i18n:types. Do not edit.\n${imports.join('\n')}\n${typeDefinition}${catalogMaps}`,
);
