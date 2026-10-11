/**
 * Guarded schema migrations (audit PR-06). Replaces `drizzle-kit migrate`, which cannot initialize an
 * empty database (see src/migration-runner.ts).
 *
 *   pnpm --filter @rms/db db:migrate --target=<development|test|rehearsal|production> [--apply]
 *
 * Without --apply it only reports what is pending (read-only). Production additionally requires
 * PRODUCTION_DATABASE_URL, RMS_PRODUCTION_DB_ENDPOINT, --confirm-production=<endpoint> and a typed
 * confirmation in an interactive terminal. The target rules live in src/guard-env.ts.
 * Never prints connection strings.
 */
import path from 'node:path';
import { resolveMigrationTarget, findRepoRoot } from '../src/guard-env';
import { runMigrations, verifyLiveIdentity } from '../src/migration-runner';
import { connectExecutor, promptVisible, readMigrationFiles, sha256Hex } from '../src/node-tooling';

async function main(): Promise<void> {
  const argv = process.argv;
  const apply = argv.includes('--apply');
  const resolved = resolveMigrationTarget({ argv });
  const files = readMigrationFiles(path.join(findRepoRoot(), 'packages', 'db', 'drizzle'));
  console.log(`[migrate] target=${resolved.target} endpoint=${resolved.db.endpoint} database=${resolved.db.database} mode=${apply ? 'APPLY' : 'plan'}`);

  const exec = await connectExecutor(resolved.url);
  try {
    await verifyLiveIdentity(exec, resolved.live);
    const plan = await runMigrations(exec, files, { apply: false, sha256: sha256Hex });
    console.log(`[migrate] already applied: ${plan.alreadyApplied.join(', ') || 'none'}`);
    console.log(`[migrate] pending: ${plan.pending.join(', ') || 'none'}`);
    if (!apply || plan.pending.length === 0) {
      if (!apply && plan.pending.length) console.log('[migrate] plan only; re-run with --apply to apply.');
      return;
    }

    if (resolved.target === 'production') {
      const typed = await promptVisible(
        `Apply ${plan.pending.length} migration(s) to PRODUCTION endpoint ${resolved.db.endpoint}? Type the endpoint id to continue: `
      );
      if (typed !== resolved.db.endpoint) throw new Error('Confirmation did not match; nothing was changed.');
    }

    const result = await runMigrations(exec, files, { apply: true, sha256: sha256Hex, log: (l) => console.log(`[migrate] ${l}`) });
    console.log(`[migrate] done. applied: ${result.applied.join(', ') || 'none'}`);
  } finally {
    await exec.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : 'migration failed');
  process.exit(1);
});
