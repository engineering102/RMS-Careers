/**
 * First super_admin for an EMPTY, MIGRATED database (audit PR-06). Runs once: it refuses as soon as
 * any admin exists. Use `pnpm admin:seed[:test]` for development and test databases instead.
 *
 *   pnpm --filter @rms/admin admin:bootstrap-first-admin --target=<production|rehearsal|test> \
 *     --email=<operator email> [--name="Full Name"] [--auth=password|github] [--confirm-production=<endpoint>]
 *
 * Secret handling: --auth=password (default) asks for the password twice through a hidden prompt in an
 * interactive terminal; it is never accepted from argv or the environment, never logged, and only its
 * bcrypt hash is stored. --auth=github stores the hash of a random secret that is discarded at once:
 * the account can then only sign in through GitHub OAuth with that email (lib/auth.ts signIn callback).
 * Target rules (pins, confirmation, CI refusal, env-file collision) are in @rms/db/guard-env; the
 * live identity of the server is verified before anything is written.
 */
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { hashPassword } from '@rms/auth';
import { findRepoRoot, resolveMigrationTarget } from '@rms/db/guard-env';
import { runMigrations, verifyLiveIdentity } from '@rms/db/migration-runner';
import { connectExecutor, promptHidden, promptVisible, readMigrationFiles, sha256Hex } from '@rms/db/node-tooling';
import { createFirstAdmin } from './lib/first-admin';

const MIN_PASSWORD_LENGTH = 14;
const flag = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

async function main(): Promise<void> {
  const resolved = resolveMigrationTarget({ argv: process.argv });
  if (resolved.target === 'development') {
    throw new Error('Use `pnpm admin:seed <email>` for development databases.');
  }
  const email = flag('email');
  const name = flag('name') ?? 'RMS Administrator';
  const mode = flag('auth') ?? 'password';
  if (!email) throw new Error('--email=<operator email> is required.');
  if (mode !== 'password' && mode !== 'github') throw new Error('--auth must be password or github.');
  if (!process.stdin.isTTY) throw new Error('Run this in an interactive terminal.');

  console.log(`[first-admin] target=${resolved.target} endpoint=${resolved.db.endpoint} database=${resolved.db.database} auth=${mode}`);
  const exec = await connectExecutor(resolved.url);
  try {
    await verifyLiveIdentity(exec, resolved.live);
    const plan = await runMigrations(exec, readMigrationFiles(path.join(findRepoRoot(), 'packages', 'db', 'drizzle')), {
      apply: false,
      sha256: sha256Hex
    });
    if (plan.pending.length > 0) {
      throw new Error(`Database is not fully migrated (pending: ${plan.pending.join(', ')}). Run db:migrate first.`);
    }

    const typed = await promptVisible(`Create the FIRST super_admin <${email}> on ${resolved.target} endpoint ${resolved.db.endpoint}? Type the endpoint id: `);
    if (typed !== resolved.db.endpoint) throw new Error('Confirmation did not match; nothing was changed.');

    let passwordHash: string;
    if (mode === 'password') {
      const password = await promptHidden(`New password (min ${MIN_PASSWORD_LENGTH} characters, hidden): `);
      if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      if ((await promptHidden('Repeat the password: ')) !== password) throw new Error('Passwords do not match; nothing was changed.');
      passwordHash = await hashPassword(password);
    } else {
      passwordHash = await hashPassword(randomBytes(48).toString('base64url'));
    }

    const { userId } = await createFirstAdmin(exec, { email, name, passwordHash, now: new Date() });
    console.log(`[first-admin] created super_admin user ${userId}.`);
    console.log('[first-admin] Next: sign in at the admin portal, then record this in the deployment log.');
  } finally {
    await exec.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message.replace(/postgres(ql)?:\S+/g, '<redacted>') : 'bootstrap failed');
  process.exit(1);
});
