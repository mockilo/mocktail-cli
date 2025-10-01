module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    'bin/**/*.ts',
    '!**/*.d.ts',
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFilesAfterEnv: [],
};
