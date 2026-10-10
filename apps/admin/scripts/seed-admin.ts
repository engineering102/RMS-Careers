import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, sql } from 'drizzle-orm';
import * as schema from '@rms/db';
import { hashPassword, hasAdminPrivileges } from '@rms/auth';
import { prepareSeedTarget } from '@rms/db/guard-env';

async function bootstrapAdmin() {
  // Slice 0 guard: explicit --target=test|development, production is rejected (exits non-zero).
  prepareSeedTarget();

  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error('ERROR: POSTGRES_URL environment variable is missing.');
    process.exit(1);
  }

  // Accept credentials via CLI arguments or environment variables
  const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const email = positional[0] || process.env.ADMIN_INITIAL_EMAIL;
  const password = positional[1] || process.env.ADMIN_INITIAL_PASSWORD;
  const name = positional[2] || process.env.ADMIN_INITIAL_NAME || 'RMS Lead Administrator';

  if (!email || !password) {
    console.log(`
Usage:
  pnpm exec tsx scripts/seed-admin.ts <email> <password> [name]

Or set environment variables:
  ADMIN_INITIAL_EMAIL="admin@rms-careers.com"
  ADMIN_INITIAL_PASSWORD="your-secure-password"
  ADMIN_INITIAL_NAME="Admin Name"
  pnpm exec tsx scripts/seed-admin.ts
`);
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('ERROR: Password must be at least 8 characters long.');
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
  console.error('[BOOTSTRAP] Fatal Error:', err);
  process.exit(1);
});
