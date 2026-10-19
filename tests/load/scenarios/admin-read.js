// Scenario 10: authorized admin READ operations (apps/admin). No writes: bulk import, enrollment changes,
// content edits and emails are deliberately out of scope (they send real email and run long single requests;
// see audit S-3). A handful of administrators is the realistic concurrency, so VUs are capped at 3.
//
// Credentials: LOAD_ADMIN_USERNAME / LOAD_ADMIN_PASSWORD for an admin account that exists ONLY in the test
// database (create it with the admin test seed). One shared account: sign-ins are staggered 15 s apart because
// the per-account sign-in limit is 5 per minute.
import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { scenarioSetup, thinkSeconds } from '../lib/options.js';
import { loadFixture } from '../lib/fixtures.js';
import { ADMIN_SESSION_COOKIE, Session } from '../lib/session.js';
import { hasAppError, isLoginPage } from '../lib/html.js';
import { authzEnforced, pageCorrect } from '../lib/metrics.js';
import { makeHandleSummary } from '../lib/summary.js';

const ROUTES = ['anon:/', '/', '/programs', '/colleges', '/batches', '/batches/:batchId', '/batches/:batchId/analytics', '/enrollments', '/content'];
const { config, guard, options: built } = scenarioSetup('admin-read', { routes: ROUTES, maxVusCap: 3 });
export const options = built;
/** Refuses CLI-overridden shapes (e.g. --vus) before any iteration runs. */
export const setup = guard;
const fixture = loadFixture();
const username = __ENV.LOAD_ADMIN_USERNAME;
const password = __ENV.LOAD_ADMIN_PASSWORD;
if (!username || !password) throw new Error('LOAD_ADMIN_USERNAME and LOAD_ADMIN_PASSWORD are required (test-database admin only).');

const PAGES = [
  ['/', '/'],
  ['/programs', '/programs'],
  ['/colleges', '/colleges'],
  ['/batches', '/batches'],
  [`/batches/${fixture.batch.id}`, '/batches/:batchId'],
  [`/batches/${fixture.batch.id}/analytics`, '/batches/:batchId/analytics'],
  ['/enrollments', '/enrollments'],
  ['/content', '/content']
];

let session = null;

export default function () {
  const anon = http.get(`${config.admin}/`, { redirects: 0, jar: new http.CookieJar(), tags: { name: 'anon:/', kind: 'authz' } });
  const refused = anon.status >= 300 && anon.status < 400 && /\/login/.test(String(anon.headers.Location ?? ''));
  authzEnforced.add(refused, { check: 'anonymous admin redirected' });
  check(null, { 'anonymous admin request is redirected to /login': () => refused });

  if (!session) {
    sleep((exec.vu.idInTest - 1) * 15);
    session = new Session({ base: config.admin, cookieName: ADMIN_SESSION_COOKIE, fields: { username, password }, landing: '/' });
  }
  if (!session.ensure()) {
    sleep(30);
    return;
  }

  const [path, name] = PAGES[Math.floor(Math.random() * PAGES.length)];
  const res = session.get(path, name);
  // `/` may redirect to a landing page inside the admin app; any same-app redirect that is not /login is fine.
  const redirectOk = res.status >= 300 && res.status < 400 && !/\/login/.test(String(res.headers.Location ?? ''));
  const ok = redirectOk || (res.status === 200 && !hasAppError(res.body) && !isLoginPage(res.body));
  pageCorrect.add(ok, { name });
  check(res, { [`${name}: admin page rendered`]: () => ok });
  sleep(thinkSeconds(config));
}

export const handleSummary = makeHandleSummary('admin-read');
