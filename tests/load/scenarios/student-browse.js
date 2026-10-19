// Scenarios 3-6 and 9: steady-state, read-only student browsing. Each VU signs in once (its own synthetic
// account), keeps the session for the whole run, and moves between the pages a student actually uses, with think
// time between pages. Every page is checked to be THIS student's page (own name in the shell, no error boundary,
// not-found or login page), which also detects sessions crossing between VUs.
//
// Page mix per step (weights): overview 25, batch workspace 20, lecture/resource 25, My Library 10,
// leaderboard 10, assessments list 7, notifications 3. Full document GETs (server-rendered with the dashboard
// layout), i.e. a hard navigation: a little more server work than a client-side soft navigation.
// Nothing here writes: opening a content page does not mark it watched (that is a Server Action).
import { check, fail, sleep } from 'k6';
import exec from 'k6/execution';
import { scenarioSetup, thinkSeconds } from '../lib/options.js';
import { accountForVu, assertEnoughAccounts, loadFixture, studentPassword } from '../lib/fixtures.js';
import { Session, STUDENT_SESSION_COOKIE } from '../lib/session.js';
import { isHealthyStudentPage } from '../lib/html.js';
import { pageCorrect } from '../lib/metrics.js';
import { makeHandleSummary } from '../lib/summary.js';

const ROUTES = ['/overview', '/batches/:batchId', '/content/:id', '/library', '/leaderboards', '/assessments', '/notifications'];
const { config, vus, guard, options: built } = scenarioSetup('student-browse', { routes: ROUTES });
export const options = built;
/** Refuses CLI-overridden shapes (e.g. --vus) before any iteration runs. */
export const setup = guard;
const fixture = loadFixture();
assertEnoughAccounts(fixture, vus);
const password = studentPassword();
if (fixture.content.length === 0) throw new Error('Fixture has no curriculum content for the batch; re-run the demo and load seeders.');

const MIX = [
  ['overview', 25],
  ['batch', 20],
  ['content', 25],
  ['library', 10],
  ['leaderboards', 10],
  ['assessments', 7],
  ['notifications', 3]
];
const TOTAL = MIX.reduce((s, [, w]) => s + w, 0);

function pick() {
  let r = Math.random() * TOTAL;
  for (const [page, w] of MIX) {
    if ((r -= w) < 0) return page;
  }
  return 'overview';
}

function target(page) {
  const batchId = fixture.batch.id;
  switch (page) {
    case 'batch':
      return [`/batches/${batchId}`, '/batches/:batchId'];
    case 'content': {
      const item = fixture.content[Math.floor(Math.random() * fixture.content.length)];
      return [`/content/${item.id}?batchId=${batchId}`, '/content/:id'];
    }
    case 'library':
      return ['/library', '/library'];
    case 'leaderboards':
      return ['/leaderboards', '/leaderboards'];
    case 'assessments':
      return ['/assessments', '/assessments'];
    case 'notifications':
      return ['/notifications', '/notifications'];
    default:
      return ['/overview', '/overview'];
  }
}

let session = null;
let account = null;

export default function () {
  if (!session) {
    account = accountForVu(fixture, exec.vu.idInTest);
    session = new Session({ base: config.student, cookieName: STUDENT_SESSION_COOKIE, fields: { email: account.email, password }, landing: '/overview' });
    // Spread first sign-ins a little so ramp-up does not turn into an accidental auth burst.
    sleep(Math.random() * 5);
  }
  if (!session.ensure()) {
    sleep(10);
    return;
  }

  const [path, name] = target(exec.vu.iterationInScenario === 0 ? 'overview' : pick());
  const res = session.get(path, name);
  const ok = res.status === 200 && isHealthyStudentPage(res.body, account.name);
  pageCorrect.add(ok, { name });
  if (!check(res, { [`${name}: 200 and this student's page`]: () => ok }) && res.status === 200 && !res.body.includes(account.name) && /Load Student \d{4}/.test(res.body)) {
    // Another synthetic student's name on this VU's page: crossed sessions. Stop the whole test.
    exec.test.abort(`Crossed session detected on ${name}`);
    fail('crossed session');
  }
  sleep(thinkSeconds(config));
}

export const handleSummary = makeHandleSummary('student-browse');
