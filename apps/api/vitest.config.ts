import { defineConfig } from 'vitest/config';

/**
 * API integration tests run against a real MongoDB-compatible server (MONGO_URI_TEST, default
 * mongodb://127.0.0.1:27017). Every test file uses its own throw-away database.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 60_000,
    hookTimeout: 240_000,
    fileParallelism: false,
    pool: 'forks',
    reporters: ['default'],
  },
});
