import { defineConfig } from 'vitest/config';
import path from 'path';

// INTEGRATION tier (`pnpm --filter @rms/admin test:int`): only `*.int.test.ts`, only against the
// guarded TEST_DATABASE_URL (setup-int aborts otherwise). Files run serially: one shared test DB.
export default defineConfig({
  test: {
    environment: 'node',
    // Every statement is a round trip to the remote NonProd Neon branch; CI runners are far from it and the 5 s default
    // timed out mid-fixture (a timed-out scenario then collided with the next one on unique codes).
    testTimeout: 60_000,
    hookTimeout: 60_000,
    globals: false,
    include: ['**/*.int.test.ts'],
    exclude: ['node_modules', '.next'],
    setupFiles: ['../../packages/db/src/testing/setup-int.ts'],
    fileParallelism: false
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  }
});
