module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 10000,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.js'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!node_modules/**',
    '!coverage/**',
    '!tests/**',
    '!jest.config.js',
    '!playwright.config.js'
  ]
};