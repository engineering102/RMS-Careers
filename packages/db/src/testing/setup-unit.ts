/**
 * Vitest setup for the UNIT tier (`pnpm test`). Unit tests must never open a database connection.
 * Strips every real database URL from the process so nothing can pick one up implicitly; tests
 * that need a URL set a local mock themselves, and the db clients refuse any non-local host
 * while Vitest is running (see assertVitestConnectionSafe in guard.ts).
 */
for (const key of ['POSTGRES_URL', 'POSTGRES_URL_NON_POOLING', 'DATABASE_URL', 'TEST_DATABASE_URL', 'TEST_DATABASE_ENDPOINT']) {
  delete process.env[key];
}
process.env.RMS_TEST_TIER = 'unit';
