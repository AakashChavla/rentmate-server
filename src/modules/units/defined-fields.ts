export function definedFields(input: object): Record<string, unknown> {
  const fields: Record<string, unknown> = Object.fromEntries(Object.entries(input));
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
}
