module.exports = {
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
    '^.+\\.m?js$': ['@swc/jest', { module: { type: 'commonjs' }, jsc: { target: 'es2022' } }],
  },
  transformIgnorePatterns: [],
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/tools/jest-env.cjs'],
  testPathIgnorePatterns: ['/node_modules/', '/test/int/', '/test/e2e/'],
  testMatch: ['**/*.spec.ts'],
  clearMocks: true,
  testTimeout: 60000,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/**/generated/**'],
};
