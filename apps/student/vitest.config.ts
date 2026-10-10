import { defineConfig } from 'vitest/config';
import path from 'path';

// UNIT tier: no env loading, no database. Live-database suites are `*.int.test.ts` (vitest.int.config.ts).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', '**/*.int.test.*'],
    setupFiles: ['../../packages/db/src/testing/setup-unit.ts']
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } }
});
