import { test, expect } from '../../support/diagnostics';
import { studentCredentials } from '../../support/credentials';
import { loginAndLand, viewAndNavigate } from '../../support/student-journey';
import { Workflow } from '../../support/workflow';

/**
 * AUTHENTICATED production run for https://student.rms-careers.com with the owner-authorized test
 * student. View/navigate only (see support/student-journey.ts). Run explicitly:
 *   pnpm test:e2e:prod:auth            (headless)   |   pnpm test:e2e:prod:auth:headed
 * Credentials: E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD in the environment or in the untracked
 * e2e/.env.production.local. Without them every step is reported BLOCKED and the test fails loudly,
 * so a missing secret can never look like a pass.
 */
test.describe.configure({ mode: 'serial' });

test('student journey: sign in, land, refresh, navigate, sign out', async ({ page, diag }, testInfo) => {
  const wf = new Workflow('production-auth', 'Production student portal: authenticated view/navigate journey');
  const creds = studentCredentials();
  if (!creds) {
    wf.blocked('all steps', 'No test-student credentials configured (E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD).');
    wf.write('student-journey.md');
    throw new Error('BLOCKED: no test-student credentials configured; nothing was attempted.');
  }
  const landed = await loginAndLand(page, diag, wf, creds);
  if (landed) await viewAndNavigate(page, diag, wf);
  else wf.blocked('5-end. Refresh, section navigation, direct open, sign out', 'did not get past sign-in/landing');
  wf.write('student-journey.md');
  await testInfo.attach('workflow.md', { body: wf.steps.map((s) => `${s.n}. [${s.status}] ${s.name} - ${s.detail}`).join('\n'), contentType: 'text/markdown' });
  expect(wf.failures().map((s) => `${s.name}: ${s.detail}`), 'failed workflow steps').toEqual([]);
});

test('fresh browser context reproduces the same sign-in/landing outcome', async ({ page, diag }) => {
  const wf = new Workflow('production-auth', 'Fresh-context sign-in/landing');
  const creds = studentCredentials();
  test.skip(!creds, 'BLOCKED: no test-student credentials configured');
  await loginAndLand(page, diag, wf, creds!);
  wf.write('fresh-context.md');
  expect(wf.failures().map((s) => `${s.name}: ${s.detail}`)).toEqual([]);
});
