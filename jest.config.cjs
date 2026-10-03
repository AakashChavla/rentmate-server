module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  clearMocks: true,
  testTimeout: 60000,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/**/generated/**'],
};
