/**
 * Bootstraps the dedicated TEST database (`pnpm --filter @rms/db test:db:bootstrap`).
 * Applies packages/db/drizzle migrations (journal order) to an EMPTY test database and
 * creates the sentinel table that the integration setup requires. Refuses anything else.
 * Reads TEST_DATABASE_URL only (shell or <repo>/.env.test.local) - never .env.local.
 */
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import { assertDatabaseAllowed } from '../src/guard';
import { normalizeEndpoint } from '../src/guard';
import { classifyContext, findRepoRoot, readTestDatabaseEndpoint, readTestDatabaseUrl } from '../src/guard-env';
import { runMigrations } from '../src/migration-runner';
import { connectExecutor, readMigrationFiles, sha256Hex } from '../src/node-tooling';

async function main() {
  const url = readTestDatabaseUrl();
  const root = findRepoRoot();
  const ctx = classifyContext(process.env, root);
  ctx.expectedTestEndpoint = readTestDatabaseEndpoint();
  // Static identity check happens here, before any connection is opened.
  assertDatabaseAllowed(url, 'test-reset', ctx);

  const sql = neon(url!);
  const live = (await sql(
    "SELECT current_setting('neon.endpoint_id', true) AS endpoint, to_regclass('public._rms_test_sentinel') AS sentinel, " +
      "(SELECT count(*)::int FROM information_schema.tables WHERE table_schema = 'public') AS tables"
  )) as Array<{ endpoint: string | null; sentinel: string | null; tables: number }>;
  const row = live[0];
  if (row.endpoint && normalizeEndpoint(row.endpoint) !== normalizeEndpoint(ctx.expectedTestEndpoint)) {
    throw new Error('[db-guard] live Neon endpoint does not match the pinned test endpoint; aborting.');
  }
  if (row.sentinel) {
    console.log('[test-db] sentinel already present; database already bootstrapped. Nothing to do.');
    return;
  }
  if (row.tables > 0) {
    throw new Error('[db-guard] test database is not empty and has no sentinel; refusing to bootstrap.');
  }

  // Same runner and journal as production (one transaction per migration), so every fresh test
  // database rehearses the production migration path (audit PR-06).
  const exec = await connectExecutor(url!);
  try {
    const result = await runMigrations(exec, readMigrationFiles(path.join(root, 'packages', 'db', 'drizzle')), {
      apply: true,
      sha256: sha256Hex,
      log: (line) => console.log(`[test-db] ${line}`)
    });
    console.log(`[test-db] applied: ${result.applied.join(', ') || 'none'}`);
  } finally {
    await exec.close();
  }
  await sql('CREATE TABLE IF NOT EXISTS _rms_test_sentinel (created_at timestamptz NOT NULL DEFAULT now())');
  await sql('INSERT INTO _rms_test_sentinel DEFAULT VALUES');
  console.log('[test-db] bootstrap complete.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : 'bootstrap failed');
  process.exit(1);
});
