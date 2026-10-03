const base = require('./jest.config.cjs');
module.exports = {
  ...base,
  setupFiles: [],
  testMatch: ['**/test/int/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
};
