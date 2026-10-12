import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    exclude: ['node_modules', '.next', 'app', 'components', '**/*.int.test.ts'],
    setupFiles: ['../../packages/db/src/testing/setup-unit.ts']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'next/font/google': path.resolve(__dirname, 'lib/__tests__/stubs/next-font-google.ts')
    }
  }
});
