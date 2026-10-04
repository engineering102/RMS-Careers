import { defineConfig } from 'drizzle-kit';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';

// Try loading local environment file from package or admin app locations
if (existsSync('.env.local')) {
  loadEnvFile('.env.local');
} else if (existsSync('../../apps/admin/.env.local')) {
  loadEnvFile('../../apps/admin/.env.local');
} else if (existsSync('.env')) {
  loadEnvFile('.env');
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL || '',
  },
});
