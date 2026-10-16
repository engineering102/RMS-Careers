// Scenario 8: formal timed assessment, deadline shape. WRITES, test environment only (LOAD_ALLOW_WRITES=1).
//
// Every VU (its own synthetic student) opens the runner, starts an attempt, answers, and submits once; all
// submissions land inside LOAD_BURST_WINDOW_S (default 180 s), modelling a class finishing together. Each
// start/submit runs an interactive Neon transaction over its own WebSocket (packages/db/src/tx.ts), which is
// what this scenario stresses (audit S-2: connection count on a direct vs pooled endpoint).
//
// One attempt per student is a product rule, so a second run against the same accounts gets ALREADY_SUBMITTED.
// Reset with `pnpm --filter @rms/student load:cleanup:test` and re-seed before re-running.
// The formal quiz must be inside its schedule window on the test database; outside it, start fails with the
// product's own error code (reported, not hidden).
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { scenarioSetup } from '../lib/options.js';
import { accountForVu, assertEnoughAccounts, loadActionIds, loadFixture, studentPassword } from '../lib/fixtures.js';
import { Session, STUDENT_SESSION_COOKIE } from '../lib/session.js';
import { isHealthyStudentPage, parseActionResult } from '../lib/html.js';
import { actionDuration, actionSuccess, pageCorrect } from '../lib/metrics.js';
import { makeHandleSummary } from '../lib/summary.js';

const ROUTES = ['/assessments/:id', 'action:startFormalAssessmentAttempt', 'action:submitFormalAssessment'];
const { config, vus, guard, options: built } = scenarioSetup('formal-assessment', { executor: 'once-per-vu', routes: ROUTES });
export const options = built;
/** Refuses CLI-overridden shapes (e.g. --vus) before any iteration runs. */
export const setup = guard;
const fixture = loadFixture();
assertEnoughAccounts(fixture, vus);
const password = studentPassword();
const actionIds = loadActionIds() ?? {};
const START = actionIds.startFormalAssessmentAttempt;
const SUBMIT = actionIds.submitFormalAssessment;
if (!START || !SUBMIT) throw new Error('LOAD_ACTION_IDS must map startFormalAssessmentAttempt and submitFormalAssessment.');
const quiz = fixture.formalQuiz;
if (!quiz || quiz.questions.length === 0) throw new Error('Fixture has no formal assessment; run the demo seeder, then the load seeder.');

function call(session, path, id, args, name) {
  const started = Date.now();
  const res = session.action(path, id, args, `action:${name}`);
  actionDuration.add(Date.now() - started, { action: name });
  const result = parseActionResult(res.body);
  const ok = res.status === 200 && result?.success === true;
  actionSuccess.add(ok, { action: name });
  // The product's error code (e.g. ALREADY_SUBMITTED, NOT_OPEN) is a bounded set: safe as a check name.
  check(res, { [`${name} succeeded`]: () => ok, [`${name}: ${result?.code ?? (ok ? 'ok' : `http ${res.status}`)}`]: () => ok });
  return ok ? result.data : null;
}

export default function () {
  const account = accountForVu(fixture, exec.vu.idInTest);
  const batchId = fixture.batch.id;
  const path = `/assessments/${quiz.id}?batchId=${batchId}`;
  const session = new Session({ base: config.student, cookieName: STUDENT_SESSION_COOKIE, fields: { email: account.email, password }, landing: '/overview' });

  // Arrive over the first part of the window, answer, and submit before it closes.
  const window = config.burstWindowS;
  sleep(Math.random() * window * 0.3);
  if (!session.ensure()) return;

  const runner = session.get(path, '/assessments/:id');
  const pageOk = runner.status === 200 && isHealthyStudentPage(runner.body, account.name);
  pageCorrect.add(pageOk, { name: '/assessments/:id' });
  check(runner, { 'formal runner renders for this student': () => pageOk });

  const attempt = call(session, path, START, [{ quizId: quiz.id, batchId }], 'startFormalAssessmentAttempt');
  if (!attempt) return;

  sleep(Math.random() * window * 0.6);

  const responses = {};
  for (const q of quiz.questions) {
    if (q.optionIds.length > 0) responses[q.id] = [q.optionIds[Math.floor(Math.random() * q.optionIds.length)]];
  }
  call(session, path, SUBMIT, [{ attemptId: attempt.attemptId, quizId: quiz.id, batchId, responses, tabBlurCount: 0, isAutoSubmit: false }], 'submitFormalAssessment');
}

export const handleSummary = makeHandleSummary('formal-assessment');
