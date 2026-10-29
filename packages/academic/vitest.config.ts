import { defineConfig } from 'vitest/config';

// Unit tier: strips database URLs so nothing here can reach a database (Slice 0).
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['../db/src/testing/setup-unit.ts']
  }
});
