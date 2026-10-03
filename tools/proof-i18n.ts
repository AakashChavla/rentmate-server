import { readText } from './file-utils';
import { withFixtures, runTool, requireRejection } from './proof-utils';
import { CATALOG_DIRECTORY } from './catalog-utils';
export function proveLocalization(): void {
  const hindi = `${CATALOG_DIRECTORY}/hi/common.json`;
  const english = `${CATALOG_DIRECTORY}/en/common.json`;
  const en = JSON.parse(readText(english)) as Record<string, string>;
  const hi = JSON.parse(readText(hindi)) as Record<string, string>;
  const key = Object.keys(en)[0];
  if (key === undefined) throw new Error('The proof needs a baseline catalog');
  const missing = Object.fromEntries(Object.entries(hi).filter(([entry]) => entry !== key));
  const cases = [
    {
      name: 'missing locale key',
      files: { [hindi]: JSON.stringify(missing) },
      diagnostic: 'Missing key',
    },
    {
      name: 'extra locale key',
      files: { [hindi]: JSON.stringify({ ...hi, extraProof: 'extra' }) },
      diagnostic: 'Extra key',
    },
    {
      name: 'placeholder mismatch',
      files: { [hindi]: JSON.stringify({ ...hi, [key]: '{proof}' }) },
      diagnostic: 'Placeholder mismatch',
    },
    {
      name: 'unused locale key',
      files: {
        [english]: JSON.stringify({ ...en, unusedProof: 'unused' }),
        [hindi]: JSON.stringify({ ...hi, unusedProof: 'unused' }),
      },
      diagnostic: 'Unused key',
    },
  ];
  for (const test of cases)
    withFixtures(test.files, () => {
      requireRejection(test.name, () => runTool('check-i18n'), test.diagnostic);
    });
}
