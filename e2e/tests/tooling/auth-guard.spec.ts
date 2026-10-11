import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect, decideRequest, type WritePermit } from '../../support/diagnostics';
import { startStudentStub, type Stub } from '../../support/stub-student';
import { loginAndLand, viewAndNavigate } from '../../support/student-journey';
import { Workflow } from '../../support/workflow';
import { PRODUCTION_ADMIN_ORIGIN, PRODUCTION_STUDENT_ORIGIN } from '../../support/targets';

const ORIGIN = 'https://student.example.test';
const permit = (over: Partial<WritePermit> = {}): WritePermit => ({ label: 'x', pathname: '/login', used: false, ...over });
const req = (method: string, url: string, headers: Record<string, string> = {}) => ({ method, url, headers });

test.describe('request guard decision (pure)', () => {
  test('reads are always allowed', () => {
    expect(decideRequest(req('GET', `${ORIGIN}/a`), ORIGIN, null)).toBe('allow');
    expect(decideRequest(req('HEAD', `${ORIGIN}/a`), ORIGIN, null)).toBe('allow');
  });
  test('writes are blocked without a permit', () => {
    for (const m of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(decideRequest(req(m, `${ORIGIN}/login`, { 'next-action': 'a' }), ORIGIN, null)).toBe('block');
    }
  });
  test('the permit allows exactly one POST Server Action on the exact origin and path', () => {
    const p = permit();
    expect(decideRequest(req('POST', `${ORIGIN}/login`, { 'next-action': 'a' }), ORIGIN, p)).toBe('permit');
    expect(decideRequest(req('POST', `${ORIGIN}/login?x=1`, { 'next-action': 'a' }), ORIGIN, p)).toBe('permit');
    expect(decideRequest(req('POST', `${ORIGIN}/login`), ORIGIN, p)).toBe('block'); // not a Server Action
    expect(decideRequest(req('POST', `${ORIGIN}/login/reset`, { 'next-action': 'a' }), ORIGIN, p)).toBe('block');
    expect(decideRequest(req('POST', `${ORIGIN}/forgot-password`, { 'next-action': 'a' }), ORIGIN, p)).toBe('block');
    expect(decideRequest(req('POST', 'https://evil.example.test/login', { 'next-action': 'a' }), ORIGIN, p)).toBe('block');
    expect(decideRequest(req('PUT', `${ORIGIN}/login`, { 'next-action': 'a' }), ORIGIN, p)).toBe('block');
    expect(decideRequest(req('POST', `${ORIGIN}/login`, { 'next-action': 'a' }), ORIGIN, permit({ used: true }))).toBe('block');
  });

  test('a form-post permit allows one plain POST to the exact path only (sign-out route, audit PR-02)', () => {
    const p = permit({ pathname: '/api/session/sign-out', kind: 'form-post' });
    expect(decideRequest(req('POST', `${ORIGIN}/api/session/sign-out`), ORIGIN, p)).toBe('permit');
    expect(decideRequest(req('POST', `${ORIGIN}/api/session/sign-out/x`), ORIGIN, p)).toBe('block');
    expect(decideRequest(req('POST', `${ORIGIN}/login`), ORIGIN, p)).toBe('block');
    expect(decideRequest(req('POST', 'https://evil.example.test/api/session/sign-out'), ORIGIN, p)).toBe('block');
    expect(decideRequest(req('DELETE', `${ORIGIN}/api/session/sign-out`), ORIGIN, p)).toBe('block');
    expect(decideRequest(req('POST', `${ORIGIN}/api/session/sign-out`), ORIGIN, { ...p, used: true })).toBe('block');
  });
});

test('hard-coded production origins match the Worker custom domains in wrangler.jsonc', () => {
  const root = path.resolve(__dirname, '..', '..', '..');
  const pattern = (app: string) => readFileSync(path.join(root, 'apps', app, 'wrangler.jsonc'), 'utf8').match(/"pattern":\s*"([^"]+)"/)?.[1];
  expect(`https://${pattern('student')}`).toBe(PRODUCTION_STUDENT_ORIGIN);
  expect(`https://${pattern('admin')}`).toBe(PRODUCTION_ADMIN_ORIGIN);
});

// ---- STUB-ONLY: validates the mechanics, says nothing about the real portal ----------------
const creds = { email: 'stub-user@example.invalid', password: 'stub-not-a-real-secret' };

test.describe('journey mechanics against a local STUB (success)', () => {
  const PORT = 39777;
  test.use({ baseURL: `http://127.0.0.1:${PORT}` });
  let stub: Stub;
  test.beforeAll(async () => {
    stub = await startStudentStub({ port: PORT });
  });
  test.afterAll(async () => stub.close());

  test('permits exactly the sign-in and sign-out POSTs and reports every step', async ({ page, diag }) => {
    const wf = new Workflow('local', 'STUB journey');
    expect(await loginAndLand(page, diag, wf, creds)).toBe(true);
    await viewAndNavigate(page, diag, wf);
    expect(wf.failures(), JSON.stringify(wf.failures())).toEqual([]);
    expect(stub.received).toHaveLength(2);
    expect(stub.received[0]).toBe('POST /login');
    expect(stub.received[1]).toBe('POST /api/session/sign-out');
    expect(wf.steps.some((s) => s.status === 'NOT IMPLEMENTED')).toBe(true); // Notifications is a non-link in the stub
    expect(wf.steps.some((s) => s.status === 'BLOCKED')).toBe(true); // approval-gated categories are never attempted
  });
});

test.describe('guard still blocks unrelated writes after login (STUB)', () => {
  const PORT = 39778;
  test.use({ baseURL: `http://127.0.0.1:${PORT}` });
  let stub: Stub;
  test.beforeAll(async () => {
    stub = await startStudentStub({ port: PORT });
  });
  test.afterAll(async () => stub.close());

  test('a second POST to /login and a POST elsewhere never reach the server', async ({ page, diag }) => {
    const wf = new Workflow('local', 'STUB guard');
    await loginAndLand(page, diag, wf, creds);
    const results = await page.evaluate(async () => {
      const send = (p: string) => fetch(p, { method: 'POST', headers: { 'next-action': 'z' }, body: 'z' }).then(() => 'sent', () => 'blocked');
      return [await send('/login'), await send('/profile')];
    });
    expect(results).toEqual(['blocked', 'blocked']);
    expect(stub.received).toEqual(['POST /login']);
  });
});

test.describe('journey detects an application exception (STUB)', () => {
  const PORT = 39779;
  test.use({ baseURL: `http://127.0.0.1:${PORT}` });
  let stub: Stub;
  test.beforeAll(async () => {
    stub = await startStudentStub({ port: PORT, failOverview: true });
  });
  test.afterAll(async () => stub.close());

  test('landing page with the Next.js exception text is a FAIL, not a pass', async ({ page, diag }) => {
    const wf = new Workflow('local', 'STUB failure');
    expect(await loginAndLand(page, diag, wf, creds)).toBe(false);
    expect(wf.firstFailure()?.name).toMatch(/Landing page renders/);
    expect(wf.firstFailure()?.detail).toMatch(/next-client-exception/);
  });
});
