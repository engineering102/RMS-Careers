import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, sql } from 'drizzle-orm';
// The schema entry, not '@rms/db': the client module imports 'server-only', which throws outside
// Next.js. That is why `pnpm admin:seed` crashed (audit E.6).
import * as schema from '@rms/db/schema';
import { hashPassword, hasAdminPrivileges } from '@rms/auth';
import { prepareSeedTarget } from '@rms/db/guard-env';
import { promptHidden } from '@rms/db/node-tooling';

const MIN_PASSWORD_LENGTH = 12;

async function bootstrapAdmin() {
  // Slice 0 guard: explicit --target=test|development, production is rejected (exits non-zero).
  prepareSeedTarget();

  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error('ERROR: POSTGRES_URL environment variable is missing.');
    process.exit(1);
  }

  // The password may NOT be a command-line argument (argv is visible in shell history and the process
  // list). It comes from ADMIN_INITIAL_PASSWORD or, interactively, a hidden prompt. There is no default
  // password. The old `<email> <password> [name]` form is refused rather than guessed at.
  const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (positional.length > 1) {
    console.error('ERROR: unexpected arguments. Do not pass the password on the command line.');
    console.error('Usage: pnpm admin:seed[:test] <email> [--name="Full Name"]');
    process.exit(1);
  }
  const nameFlag = process.argv.find((a) => a.startsWith('--name='))?.slice('--name='.length);
  const email = positional[0] || process.env.ADMIN_INITIAL_EMAIL;
  const name = nameFlag || process.env.ADMIN_INITIAL_NAME || 'RMS Lead Administrator';

  if (!email) {
    console.log(`
Usage:
  pnpm admin:seed <email> [--name="Full Name"]        (development, rms_dev* only)
  pnpm admin:seed:test <email> [--name="Full Name"]   (pinned test database)

The password is read from ADMIN_INITIAL_PASSWORD, or prompted for (hidden) in an interactive terminal.
Production is not a seed target: see the first-admin runbook in docs/audits/production-readiness-audit.md.
`);
    process.exit(1);
  }

  let password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!password) {
    password = await promptHidden('Password for the new administrator (hidden): ');
    const again = await promptHidden('Repeat the password: ');
    if (password !== again) {
      console.error('ERROR: passwords do not match.');
      process.exit(1);
    }
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`ERROR: Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
    process.exit(1);
  }

  const cleanEmail = email.trim().toLowerCase();
  const sqlClient = neon(connectionString);
  const db = drizzle(sqlClient, { schema });

  console.log(`[BOOTSTRAP] Checking existing user record for: ${cleanEmail}`);

  const existingUsers = await db
    .select()
    .from(schema.users)
    .where(sql`LOWER(${schema.users.email}) = ${cleanEmail}`)
    .limit(1);

  if (existingUsers.length > 0) {
    const existingUser = existingUsers[0];
    console.log(`[BOOTSTRAP] User already exists (ID: ${existingUser.id}). Checking roles...`);

    const existingRoles = await db
      .select()
      .from(schema.userRoles)
      .where(eq(schema.userRoles.userId, existingUser.id));

    const hasAdmin = hasAdminPrivileges(existingRoles);

    if (hasAdmin) {
      console.log(`[BOOTSTRAP] User already possesses administrative privileges.`);
      process.exit(0);
    }

    console.log(`[BOOTSTRAP] Assigning 'super_admin' role to existing user...`);
    await db.insert(schema.userRoles).values({
      userId: existingUser.id,
      role: 'super_admin'
    });
    console.log(`[BOOTSTRAP] Success: 'super_admin' role assigned to ${cleanEmail}`);
    process.exit(0);
  }

  console.log(`[BOOTSTRAP] Hashing password with bcrypt (12 rounds)...`);
  const passwordHash = await hashPassword(password);

  console.log(`[BOOTSTRAP] Creating active administrator record...`);
  const inserted = await db
    .insert(schema.users)
    .values({
      email: cleanEmail,
      name,
      passwordHash,
      status: 'active',
      emailVerifiedAt: new Date()
    })
    .returning({ id: schema.users.id, email: schema.users.email });

  const newAdmin = inserted[0];

  console.log(`[BOOTSTRAP] Assigning 'super_admin' role...`);
  await db.insert(schema.userRoles).values({
    userId: newAdmin.id,
    role: 'super_admin'
  });

  console.log(`\n============================================================`);
  console.log(`[SUCCESS] Admin account created successfully!`);
  console.log(`  User ID: ${newAdmin.id}`);
  console.log(`  Email:   ${newAdmin.email}`);
  console.log(`  Role:    super_admin`);
  console.log(`  Status:  active`);
  console.log(`============================================================\n`);
  console.log(`You can now sign in at the Admin portal using this email.`);
}

bootstrapAdmin().catch((err) => {
  // Message only, credentials redacted: a driver error can carry the connection string.
  console.error('[BOOTSTRAP] Fatal Error:', err instanceof Error ? err.message.replace(/postgres(ql)?:\S+/g, '<redacted>') : 'unknown');
  process.exit(1);
});
