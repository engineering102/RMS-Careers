// Scenario 7: practice knowledge checks with permitted retakes. WRITES (quiz_attempts rows, first-pass XP), so it
// runs only with LOAD_ALLOW_WRITES=1 against a non-production target seeded by the load seeder.
//
// Journey per iteration: open the practice runner, "answer" for 30-90 s, submit through the real Server Action
// (submitPracticeQuizAttempt), check the structured result. Repeated iterations are retakes, which the product
// allows without limit. Answers are random option ids, so pass and fail both occur; grading is server-side.
//
// Requires LOAD_ACTION_IDS: a JSON map produced from the SAME build the target runs
//   node tests/load/scripts/extract-action-ids.mjs <path to the build's .next or .open-next dir> > ids.json
// Server Action ids change with every build; a stale id gets a 404 / "Server action not found" (counted as failure).
//
// Also verifies, once per VU, that the same action called WITHOUT a session is refused (rms_authz_enforced).
import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { scenarioSetup } from '../lib/options.js';
import { accountForVu, assertEnoughAccounts, loadActionIds, loadFixture, studentPassword } from '../lib/fixtures.js';
import { Session, STUDENT_SESSION_COOKIE } from '../lib/session.js';
import { isHealthyStudentPage, parseActionResult } from '../lib/html.js';
import { actionDuration, actionSuccess, authzEnforced, pageCorrect } from '../lib/metrics.js';
import { makeHandleSummary } from '../lib/summary.js';

const ROUTES = ['/assessments/:id', 'action:submitPracticeQuizAttempt', 'anon-action:submitPracticeQuizAttempt'];
const { config, vus, guard, options: built } = scenarioSetup('practice-quiz', { routes: ROUTES });
export const options = built;
/** Refuses CLI-overridden shapes (e.g. --vus) before any iteration runs. */
export const setup = guard;
const fixture = loadFixture();
assertEnoughAccounts(fixture, vus);
const password = studentPassword();
const actionIds = loadActionIds();
const ACTION = actionIds?.submitPracticeQuizAttempt;
if (!ACTION) throw new Error('LOAD_ACTION_IDS must map submitPracticeQuizAttempt to the target build\'s action id.');
const quiz = fixture.practiceQuiz;
if (!quiz || quiz.questions.length === 0) throw new Error('Fixture has no practice quiz; run the demo seeder, then the load seeder.');

function randomResponses() {
  const out = {};
  for (const q of quiz.questions) {
    if (q.optionIds.length > 0) out[q.id] = [q.optionIds[Math.floor(Math.random() * q.optionIds.length)]];
  }
  return out;
}

let session = null;
let account = null;
let checkedAnonymous = false;

export default function () {
  const path = `/assessments/${quiz.id}?batchId=${fixture.batch.id}`;
  const args = [{ quizId: quiz.id, responses: randomResponses(), batchId: fixture.batch.id }];

  if (!checkedAnonymous) {
    checkedAnonymous = true;
    const anon = http.post(`${config.student}${path}`, JSON.stringify(args), {
      redirects: 0,
      jar: new http.CookieJar(),
      headers: { 'Next-Action': ACTION, Accept: 'text/x-component', 'Content-Type': 'text/plain;charset=UTF-8', Origin: config.student },
      tags: { name: 'anon-action:submitPracticeQuizAttempt', kind: 'authz' }
    });
    // Refused either by the middleware (redirect to /login) or by the action itself ({ success: false }).
    const result = parseActionResult(anon.body);
    const refused = (anon.status >= 300 && anon.status < 400) || (result !== null && result.success === false);
    authzEnforced.add(refused, { check: 'anonymous action refused' });
    check(null, { 'anonymous Server Action is refused': () => refused });
  }

  if (!session) {
    account = accountForVu(fixture, exec.vu.idInTest);
    session = new Session({ base: config.student, cookieName: STUDENT_SESSION_COOKIE, fields: { email: account.email, password }, landing: '/overview' });
    sleep(Math.random() * 5);
  }
  if (!session.ensure()) {
    sleep(10);
    return;
  }

  const runner = session.get(path, '/assessments/:id');
  const pageOk = runner.status === 200 && isHealthyStudentPage(runner.body, account.name);
  pageCorrect.add(pageOk, { name: '/assessments/:id' });
  check(runner, { 'practice runner renders for this student': () => pageOk });

  sleep(30 + Math.random() * 60);

  const started = Date.now();
  const res = session.action(path, ACTION, args, 'action:submitPracticeQuizAttempt');
  actionDuration.add(Date.now() - started, { action: 'submitPracticeQuizAttempt' });
  const result = parseActionResult(res.body);
  const ok = res.status === 200 && result?.success === true;
  actionSuccess.add(ok, { action: 'submitPracticeQuizAttempt' });
  check(res, { 'practice submission graded': () => ok });

  sleep(10 + Math.random() * 20);
}

export const handleSummary = makeHandleSummary('practice-quiz');
