/**
 * Vitest setup for the INTEGRATION tier (`pnpm test:int`). Runs before any test file imports the
 * db client. Fails closed (throws) unless a dedicated test database is positively identified:
 *   1. BEFORE any connection: TEST_DATABASE_URL (shell/CI secret or <repo>/.env.test.local) is on
 *      the Neon endpoint pinned by TEST_DATABASE_ENDPOINT and shares no endpoint with any
 *      application database URL or RMS_PRODUCTION_DB_HOSTS entry (database name is NOT trusted);
 *   2. the server's own Neon endpoint id, when it reports one, equals the pin;
 *   3. the sentinel table _rms_test_sentinel exists (created only by the test-DB bootstrap).
 * Only then is POSTGRES_URL pointed at the test database, in this process only.
 */
import { neon } from '@neondatabase/serverless';
import { DatabaseGuardError, normalizeEndpoint } from '../guard';
import { readTestDatabaseEndpoint, resolveTestDatabaseUrl } from '../guard-env';

const url = resolveTestDatabaseUrl();
const pin = readTestDatabaseEndpoint()!;

const sql = neon(url);
const rows = (await sql(
  "SELECT current_setting('neon.endpoint_id', true) AS endpoint, to_regclass('public._rms_test_sentinel') AS sentinel"
)) as Array<{ endpoint: string | null; sentinel: string | null }>;
const live = rows[0];
if (live?.endpoint && normalizeEndpoint(live.endpoint) !== normalizeEndpoint(pin)) {
  throw new DatabaseGuardError('Live Neon endpoint does not match the pinned test endpoint; aborting.', 'unknown');
}
if (!live?.sentinel) {
  throw new DatabaseGuardError(
    'Sentinel table _rms_test_sentinel is missing; run the test-DB bootstrap (pnpm test:db:bootstrap) first.',
    'unknown'
  );
}

process.env.TEST_DATABASE_URL = url;
process.env.TEST_DATABASE_ENDPOINT = pin;
process.env.POSTGRES_URL = url;
delete process.env.DATABASE_URL;
process.env.RMS_TEST_TIER = 'integration';
