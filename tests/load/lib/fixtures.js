// Fixture loading (k6 init context only). The fixture is written by the guarded seeder:
//   pnpm --filter @rms/student load:seed:test -- --count=<N>
// It holds synthetic emails and ids, never passwords. LOAD_FIXTURE must be an ABSOLUTE path (run.mjs sets it).
import { SharedArray } from 'k6/data';

function readFixture() {
  const file = __ENV.LOAD_FIXTURE;
  if (!file) throw new Error('LOAD_FIXTURE is not set. Use tests/load/run.mjs, or pass an absolute path with -e LOAD_FIXTURE=...');
  return JSON.parse(open(file));
}

let cached = null;

/** Whole fixture document (small: ids only) plus the accounts as a SharedArray (one copy for all VUs). */
export function loadFixture() {
  if (cached) return cached;
  const doc = readFixture();
  if (doc.schemaVersion !== 1) throw new Error('Unsupported fixture schemaVersion; re-run the load seeder.');
  const accounts = new SharedArray('accounts', () => doc.accounts);
  cached = {
    accounts,
    batch: doc.batch,
    foreignBatch: doc.foreignBatch,
    content: doc.content ?? [],
    practiceQuiz: doc.practiceQuiz ?? null,
    formalQuiz: doc.formalQuiz ?? null
  };
  return cached;
}

/**
 * Each VU owns exactly one account for the whole run, so concurrent VUs never share a session, per-account
 * rate-limit bucket or quiz attempt. Refuses to start when there are fewer accounts than peak VUs.
 */
export function assertEnoughAccounts(fixture, maxVus) {
  if (fixture.accounts.length < maxVus) {
    throw new Error(`Fixture has ${fixture.accounts.length} accounts but the profile peaks at ${maxVus} VUs. Re-seed with --count=${maxVus}.`);
  }
}

export function accountForVu(fixture, vu) {
  return fixture.accounts[vu - 1];
}

export function studentPassword() {
  const p = __ENV.LOAD_TEST_STUDENT_PASSWORD;
  if (!p) throw new Error('LOAD_TEST_STUDENT_PASSWORD is not set.');
  return p;
}

/** Action ids are per build: extract them from the deployed build with scripts/extract-action-ids.mjs. */
export function loadActionIds() {
  const file = __ENV.LOAD_ACTION_IDS;
  if (!file) return null;
  return JSON.parse(open(file));
}
