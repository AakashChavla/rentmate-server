module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/tools/jest-env.cjs'],
  testPathIgnorePatterns: ['/node_modules/', '/test/int/', '/test/e2e/'],
  testMatch: ['**/*.spec.ts'],
  clearMocks: true,
  testTimeout: 60000,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/**/generated/**'],
};
