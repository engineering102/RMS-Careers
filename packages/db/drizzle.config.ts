import { defineConfig } from 'drizzle-kit';
import { assertDatabaseAllowed } from './src/guard';

/**
 * drizzle-kit configuration (audit PR-06).
 *
 * This file used to load `.env.local`, then `apps/admin/.env.local`, then `.env` and hand whatever
 * POSTGRES_URL it found to drizzle-kit. `apps/admin/.env.local` points at a production-class database,
 * so `db:push` / `drizzle-kit migrate` could silently change it. Now:
 *  - no env file is ever loaded here;
 *  - `generate` / `check` / `up` need no database and get none;
 *  - `migrate` is refused: it applies all pending migrations in one transaction, which cannot
 *    initialize an empty database (enum values). Use `pnpm --filter @rms/db db:migrate --target=...`;
 *  - every other command that connects (push, studio, pull/introspect, drop) requires
 *    RMS_DB_TARGET=development and a POSTGRES_URL from the shell that the guard classifies as an
 *    `rms_dev*` database. There is no production path through drizzle-kit.
 */
const command = process.argv.slice(2).find((a) => !a.startsWith('-')) ?? '';
const OFFLINE = new Set(['generate', 'check', 'up', 'export', '']);

function databaseUrl(): string {
  if (OFFLINE.has(command)) return '';
  if (command === 'migrate') {
    throw new Error(
      '[drizzle.config] `drizzle-kit migrate` is disabled: use `pnpm --filter @rms/db db:migrate --target=<target>` (per-migration transactions, target guard).'
    );
  }
  if (process.env.RMS_DB_TARGET !== 'development') {
    throw new Error(`[drizzle.config] \`drizzle-kit ${command}\` connects to a database: set RMS_DB_TARGET=development and POSTGRES_URL (rms_dev* only) in the shell.`);
  }
  const url = process.env.POSTGRES_URL;
  assertDatabaseAllowed(url, 'dev-migrate', { productionHosts: (process.env.RMS_PRODUCTION_DB_HOSTS ?? '').split(',') });
  return url!;
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl()
  }
});
