/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
  // Testcontainers can take a while to pull images on first run
  testTimeout: 120_000,
  globalSetup: '<rootDir>/test/integration/global-setup.ts',
  globalTeardown: '<rootDir>/test/integration/global-teardown.ts',
  moduleNameMapper: {
    '^@ks-mes/common$': '<rootDir>/../../packages/common/src/index.ts',
    '^@ks-mes/types$': '<rootDir>/../../packages/types/src/index.ts',
  },
};
