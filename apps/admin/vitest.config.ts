import { defineConfig } from 'vitest/config';
import path from 'path';

// UNIT tier. No environment files are loaded here on purpose (Slice 0): unit tests must never
// reach a database. Live-database suites are `*.int.test.ts`, run by vitest.int.config.ts.
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    exclude: ['node_modules', '.next', 'app', 'components', '**/*.int.test.ts'],
    setupFiles: ['../../packages/db/src/testing/setup-unit.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/csv/**', 'lib/utils/**'],
      exclude: ['node_modules', '.next']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  }
});
