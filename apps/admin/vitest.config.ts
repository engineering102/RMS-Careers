import { defineConfig } from 'vitest/config';
import path from 'path';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';

if (existsSync('.env.local')) {
  loadEnvFile('.env.local');
}

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    exclude: ['node_modules', '.next', 'app', 'components'],
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
