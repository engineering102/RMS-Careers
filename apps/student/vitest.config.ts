import { defineConfig } from 'vitest/config';
import path from 'path';

// UNIT tier: no env loading, no database. Live-database suites are `*.int.test.ts` (vitest.int.config.ts).
export default defineConfig({
  test: {
    environment: 'node',
    // Several suites hash with pure-JS bcrypt and import heavy modules dynamically; the 5 s default flaked under
    // parallel load (final review). Assertions are unchanged.
    testTimeout: 15_000,
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', '**/*.int.test.*'],
    setupFiles: ['../../packages/db/src/testing/setup-unit.ts']
  },
  // Components rely on the automatic JSX runtime (no `import React`), as Next compiles them.
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } }
});
