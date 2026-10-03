const base = require('./jest.config.cjs');
module.exports = {
  ...base,
  testMatch: ['**/test/e2e/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
};
