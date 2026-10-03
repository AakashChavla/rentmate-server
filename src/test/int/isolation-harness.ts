export type IsolationCase = () => Promise<void>;
export function publicMethods(repository: object): string[] {
  const methods = new Set<string>();
  let prototype: object | null = Object.getPrototypeOf(repository) as object | null;
  while (prototype && prototype !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(prototype)) {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
      if (
        name !== 'constructor' &&
        typeof descriptor?.value === 'function' &&
        !name.startsWith('_') &&
        name !== 'scope'
      )
        methods.add(name);
    }
    prototype = Object.getPrototypeOf(prototype) as object | null;
  }
  return [...methods];
}
export async function verifyIsolation(
  repository: object,
  cases: Record<string, IsolationCase>,
): Promise<void> {
  for (const name of publicMethods(repository)) {
    const test = cases[name];
    if (!test) throw new Error(`No tenant-isolation case registered for ${name}`);
    await test();
  }
}
