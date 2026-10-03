import js from '@eslint/js';
import ts from 'typescript-eslint';
const literalSelectors = [
  {
    selector:
      'BinaryExpression[operator=/^(===|!==|==|!=)$/][left.type!="UnaryExpression"] > Literal[raw=/^[\\\'"]/]',
    message: 'Use a named constant instead of comparing a string literal.',
  },
  { selector: 'SwitchCase > Literal', message: 'Use a named constant for switch cases.' },
  {
    selector: 'NewExpression[callee.name=/Error$/] > Literal',
    message: 'Use an error code/catalog instead of an inline error message.',
  },
  {
    selector: 'CallExpression[callee.name="forwardRef"]',
    message: 'Circular module wiring is forbidden.',
  },
];
export default ts.config(
  { ignores: ['node_modules/**', 'dist/**', 'src/**/generated/**'] },
  js.configs.recommended,
  ...ts.configs.strictTypeChecked,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: { project: './tsconfig.json', tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': [
        'error',
        { max: 50, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      complexity: ['error', 10],
      '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
      '@typescript-eslint/no-extraneous-class': [
        'error',
        { allowEmpty: true, allowWithDecorator: true },
      ],
      '@typescript-eslint/no-magic-numbers': [
        'error',
        {
          ignore: [0, 1, -1],
          ignoreEnums: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
          ignoreArrayIndexes: true,
        },
      ],
      'no-restricted-syntax': ['error', ...literalSelectors],
      'no-restricted-imports': ['error', { paths: ['typeorm', '@nestjs/typeorm'] }],
    },
  },
  {
    files: [
      '**/*.constants.ts',
      '**/*.spec.ts',
      'tools/**/*.ts',
      '**/*.entity.ts',
      '**/*.repository.ts',
      '**/*.module.ts',
      'src/core/database/**/*.ts',
      'src/test/**/*.ts',
    ],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['**/*.constants.ts', '**/*.spec.ts', 'tools/**/*.ts', 'src/test/**/*.ts'],
    rules: { '@typescript-eslint/no-magic-numbers': 'off', 'no-restricted-syntax': 'off' },
  },
);
