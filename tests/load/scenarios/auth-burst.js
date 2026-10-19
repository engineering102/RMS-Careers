// Scenario 2: sign-in burst at lab start. Every VU is a different synthetic student who signs in ONCE at a random
// moment inside LOAD_BURST_WINDOW_S (default 180 s), then opens the overview to prove the session works.
//
// Interpretation: all VUs share the load generator's source IP, exactly like a campus behind one NAT, so the
// per-IP limiter (AUTH_CLIENT_LIMIT, 60/min in apps/student/lib/security/request-limits.ts) is part of what is
// measured. rms_rate_limited > 0 is a finding (audit S-1), not a test bug. Run steady-state browsing separately.
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { scenarioSetup } from '../lib/options.js';
import { accountForVu, assertEnoughAccounts, loadFixture, studentPassword } from '../lib/fixtures.js';
import { signIn, Session, STUDENT_SESSION_COOKIE } from '../lib/session.js';
import { isHealthyStudentPage } from '../lib/html.js';
import { pageCorrect } from '../lib/metrics.js';
import { makeHandleSummary } from '../lib/summary.js';

const ROUTES = ['/api/auth/csrf', '/api/auth/callback/credentials', '/overview'];
const { config, vus, guard, options: built } = scenarioSetup('auth-burst', { executor: 'once-per-vu', routes: ROUTES });
export const options = built;
/** Refuses CLI-overridden shapes (e.g. --vus) before any iteration runs. */
export const setup = guard;
const fixture = loadFixture();
assertEnoughAccounts(fixture, vus);
const password = studentPassword();

export default function () {
  const account = accountForVu(fixture, exec.vu.idInTest);
  sleep(Math.random() * config.burstWindowS);

  const result = signIn({
    base: config.student,
    cookieName: STUDENT_SESSION_COOKIE,
    fields: { email: account.email, password },
    landing: '/overview'
  });
  check(result, { 'sign-in succeeded': (r) => r.ok, 'sign-in not rate limited': (r) => !r.rateLimited });
  if (!result.ok) return;

  const session = new Session({ base: config.student, cookieName: STUDENT_SESSION_COOKIE, fields: {}, landing: '/overview' });
  session.cookie = result.cookie;
  const res = session.get('/overview', '/overview');
  const ok = res.status === 200 && isHealthyStudentPage(res.body, account.name);
  pageCorrect.add(ok);
  check(res, { 'overview after sign-in is this student': () => ok });
}

export const handleSummary = makeHandleSummary('auth-burst');
