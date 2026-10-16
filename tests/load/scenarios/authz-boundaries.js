// Scenario: access control under load. Mixed with real traffic, every check here must hold 100% of the time
// (rms_authz_enforced rate==1). Read-only.
//   1. Anonymous request to a protected page -> redirected to /login by the middleware (no page rendered).
//   2. Signed-in student opens another college's batch workspace -> not-found page, other batch never shown.
//   3. Signed-in student opens a random content id in that foreign batch -> not-found page.
// Server Actions called without a session are covered in practice-quiz.js (it needs per-build action ids).
import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { scenarioSetup, thinkSeconds } from '../lib/options.js';
import { accountForVu, assertEnoughAccounts, loadFixture, studentPassword } from '../lib/fixtures.js';
import { Session, STUDENT_SESSION_COOKIE } from '../lib/session.js';
import { hasAppError, isNotFoundPage } from '../lib/html.js';
import { authzEnforced } from '../lib/metrics.js';
import { makeHandleSummary } from '../lib/summary.js';

const ROUTES = ['anon:/overview', 'foreign:/batches/:batchId', 'foreign:/content/:id'];
const { config, vus, guard, options: built } = scenarioSetup('authz-boundaries', { routes: ROUTES });
export const options = built;
/** Refuses CLI-overridden shapes (e.g. --vus) before any iteration runs. */
export const setup = guard;
const fixture = loadFixture();
assertEnoughAccounts(fixture, vus);
const password = studentPassword();

function uuid() {
  const h = () => Math.floor(Math.random() * 16).toString(16);
  const s = (n) => Array.from({ length: n }, h).join('');
  return `${s(8)}-${s(4)}-4${s(3)}-8${s(3)}-${s(12)}`;
}

function record(name, ok) {
  authzEnforced.add(ok, { check: name });
  check(null, { [name]: () => ok });
}

let session = null;

export default function () {
  // 1. Anonymous: a fresh, empty cookie jar for this one request.
  const anon = http.get(`${config.student}/overview`, { redirects: 0, jar: new http.CookieJar(), tags: { name: 'anon:/overview', kind: 'authz' } });
  record('anonymous is redirected to /login', anon.status >= 300 && anon.status < 400 && /\/login/.test(String(anon.headers.Location ?? '')));

  if (!session) {
    const account = accountForVu(fixture, exec.vu.idInTest);
    session = new Session({ base: config.student, cookieName: STUDENT_SESSION_COOKIE, fields: { email: account.email, password }, landing: '/overview' });
    sleep(Math.random() * 5);
  }
  if (!session.ensure()) {
    sleep(10);
    return;
  }

  // 2. Another college's batch.
  const foreign = session.get(`/batches/${fixture.foreignBatch.id}`, 'foreign:/batches/:batchId', 'authz');
  record('foreign batch is not shown', !hasAppError(foreign.body) && (foreign.status === 404 || isNotFoundPage(foreign.body)));

  // 3. Unknown content in the foreign batch.
  const content = session.get(`/content/${uuid()}?batchId=${fixture.foreignBatch.id}`, 'foreign:/content/:id', 'authz');
  record('foreign content is not shown', !hasAppError(content.body) && (content.status === 404 || isNotFoundPage(content.body)));

  sleep(thinkSeconds(config));
}

export const handleSummary = makeHandleSummary('authz-boundaries');
