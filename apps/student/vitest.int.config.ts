import { defineConfig } from 'vitest/config';
import path from 'path';

// INTEGRATION tier: only `*.int.test.ts`, only against the guarded TEST_DATABASE_URL.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.int.test.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    setupFiles: ['../../packages/db/src/testing/setup-int.ts'],
    fileParallelism: false
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } }
});
