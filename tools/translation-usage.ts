import ts from 'typescript';
import { listFiles, readText } from './file-utils';
const TRANSLATORS = new Set(['t', 'translate', 'messageKey']);
function isTranslator(call: ts.CallExpression): boolean {
  const expression = call.expression;
  if (ts.isIdentifier(expression)) return TRANSLATORS.has(expression.text);
  return ts.isPropertyAccessExpression(expression) && TRANSLATORS.has(expression.name.text);
}
function keysInFile(target: string): string[] {
  const source = ts.createSourceFile(target, readText(target), ts.ScriptTarget.Latest, true);
  const keys: string[] = [];
  function inspect(node: ts.Node): void {
    if (ts.isCallExpression(node) && isTranslator(node)) {
      const first = node.arguments[0];
      if (first && ts.isStringLiteral(first)) keys.push(first.text);
    }
    ts.forEachChild(node, inspect);
  }
  inspect(source);
  return keys;
}
export function usedKeys(): Set<string> {
  const files = listFiles('src').filter(
    (target) => /\.tsx?$/.test(target) && !/(?:generated|\.spec\.|\.test\.)/.test(target),
  );
  return new Set(files.flatMap(keysInFile));
}
