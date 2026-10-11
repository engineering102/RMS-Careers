/**
 * Student portal journey: VIEW and NAVIGATE only.
 *
 * Network policy: the read-only guard (support/diagnostics.ts) stays on. Exactly two single-use
 * Server Action POSTs are permitted: the sign-in form (POST /login) and, last, the header "Sign out"
 * form (POST to the current path; it only clears the session cookie, see apps/student/lib/actions/auth.ts).
 * Nothing here opens a content item, starts or submits a quiz/assessment/practice problem, edits the
 * profile, switches cohort or marks notifications read: those can persist progress, XP or streaks and
 * need explicit owner approval.
 *
 * The same function runs against production (tests/production-auth) and against a local STUB
 * (tests/tooling) to validate the mechanics. Only the production run says anything about production.
 */
import { expect, type Page } from '@playwright/test';
import type { Diagnostics } from './diagnostics';
import type { Credentials } from './credentials';
import { Workflow } from './workflow';

/** Top-level student sections, from apps/student/components/shell/nav-items.ts (links are discovered, not assumed). */
export const SECTIONS: Array<{ path: string; title: string; feature: string }> = [
  { path: '/overview', title: 'Overview', feature: 'dashboard / XP / streak / deadlines' },
  { path: '/profile', title: 'Profile', feature: 'profile and statistics' },
  { path: '/batches', title: 'Batch Workspace', feature: 'accessible batches' },
  { path: '/library', title: 'My Library', feature: 'library / learning resources (list only)' },
  { path: '/dsa', title: 'DSA Practice', feature: 'practice problems (list only)' },
  { path: '/assessments', title: 'Assessments', feature: 'assessments (list only)' },
  { path: '/leaderboards', title: 'Leaderboards', feature: 'leaderboard' },
  { path: '/notifications', title: 'Notifications', feature: 'notifications (view only)' }
];

const EMPTY_STATE = /No Active Batch Enrollments/i;

function newFindings(diag: Diagnostics, before: number): string[] {
  return diag.criticalFindings().slice(before);
}

async function assertHealthy(page: Page, diag: Diagnostics, label: string, before: number): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(1000);
  await diag.inspect(label, { sampleText: false });
  const found = newFindings(diag, before);
  if (found.length) throw new Error(found.join(' ; '));
}

export async function loginAndLand(page: Page, diag: Diagnostics, wf: Workflow, creds: Credentials): Promise<boolean> {
  if (
    !(await wf.run('1. Login page renders; email/password usable', async () => {
      const before = diag.criticalFindings().length;
      await page.goto('/login', { waitUntil: 'load' });
      await expect(page.locator('input[name="email"]')).toBeEditable();
      await expect(page.locator('input[name="password"]')).toBeEditable();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeEnabled();
      await assertHealthy(page, diag, '/login', before);
      return `initial URL ${new URL(page.url()).pathname}`;
    }))
  ) {
    wf.blocked('2-4. Sign-in, redirect, landing page', 'login page did not render');
    return false;
  }

  let landing = '';
  const signedIn = await wf.run('2-3. Sign-in submitted (one permitted POST) and browser leaves /login', async () => {
    const disarm = diag.permitOne('student sign-in', '/login');
    try {
      await page.locator('input[name="email"]').fill(creds.email);
      await page.locator('input[name="password"]').fill(creds.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      try {
        await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });
      } catch {
        const alert = await page.getByRole('alert').first().innerText().catch(() => '');
        throw new Error(`still on /login after submit${alert ? ` (page says: ${alert.slice(0, 120)})` : ''}`);
      }
    } finally {
      disarm();
    }
    landing = new URL(page.url()).pathname;
    return `landed on ${landing}`;
  });
  if (!signedIn) {
    wf.blocked('4. Landing page renders', 'sign-in did not leave /login');
    return false;
  }

  return wf.run('4. Landing page renders without uncaught exception / hydration or RSC error', async () => {
    await assertHealthy(page, diag, `landing ${landing}`, 0);
    return `landing ${landing}`;
  });
}

export async function viewAndNavigate(page: Page, diag: Diagnostics, wf: Workflow): Promise<void> {
  const landing = new URL(page.url()).pathname;

  await wf.run('5. Refresh preserves the session and renders', async () => {
    const before = diag.criticalFindings().length;
    await page.reload({ waitUntil: 'load' });
    expect(new URL(page.url()).pathname, 'session lost on refresh').toBe(landing);
    await assertHealthy(page, diag, `refresh ${landing}`, before);
  });

  const reachable: string[] = [];
  let n = 6;
  for (const s of SECTIONS) {
    const name = `${n}. ${s.title}: ${s.feature}`;
    const link = page.locator(`a[href="${s.path}"]`).first();
    if ((await link.count()) === 0) {
      const listed = await page.getByText(s.title, { exact: true }).count();
      if (listed > 0) wf.notImplemented(name, 'listed in navigation but not a link (disabled / coming soon)');
      else wf.blocked(name, 'not present in the navigation for this account');
      n++;
      continue;
    }
    const ok = await wf.run(name, async () => {
      const before = diag.criticalFindings().length;
      await link.click();
      await page.waitForURL((u) => u.pathname === s.path, { timeout: 20_000 }).catch(() => undefined);
      const path = new URL(page.url()).pathname;
      if (path.startsWith('/login')) throw new Error(`redirected to /login (session lost) when opening ${s.path}`);
      if (path !== s.path) throw new Error(`expected ${s.path}, ended on ${path}`);
      await assertHealthy(page, diag, s.path, before);
      const empty = EMPTY_STATE.test(await page.locator('body').innerText().catch(() => ''));
      return empty ? 'renders; account shows the "No Active Batch Enrollments" empty state' : 'renders';
    });
    if (ok) reachable.push(s.path);
    n++;
  }

  // Curriculum is a drill-down of Batch Workspace; read-only pages only, never a content item.
  const curriculumName = `${n++}. Batch curriculum (drill-down from /batches)`;
  if (!reachable.includes('/batches')) wf.blocked(curriculumName, '/batches was not reachable in the steps above');
  else await wf.run(curriculumName, async () => {
    await page.goto('/batches', { waitUntil: 'load' });
    const batch = page.locator('a[href^="/batches/"]').first();
    if ((await batch.count()) === 0) return 'no accessible batch links for this account (empty state); curriculum not reachable';
    const before = diag.criticalFindings().length;
    await batch.click();
    await page.waitForLoadState('load');
    const cur = page.locator('a[href$="/curriculum"]').first();
    if ((await cur.count()) === 0) {
      await assertHealthy(page, diag, 'batch workspace', before);
      return 'batch workspace renders; no curriculum link exposed';
    }
    await cur.click();
    await page.waitForURL(/\/curriculum$/, { timeout: 20_000 });
    await assertHealthy(page, diag, 'curriculum', before);
    return 'batch workspace and curriculum render';
  });

  wf.blocked(
    `${n++}. Recorded lectures / content player, practice submit, quizzes, formal assessments`,
    'Not attempted: opening content or submitting practice/assessments can persist progress, XP, streaks or leaderboard rank. Needs explicit owner approval per category.'
  );

  await wf.run(`${n++}. Direct open of authorized routes`, async () => {
    const bad: string[] = [];
    for (const p of reachable) {
      const before = diag.criticalFindings().length;
      await page.goto(p, { waitUntil: 'load' });
      await page.waitForTimeout(500);
      const path = new URL(page.url()).pathname;
      if (path !== p || newFindings(diag, before).length) bad.push(`${p}→${path}`);
    }
    if (bad.length) throw new Error(`direct open problems: ${bad.join(', ')}`);
    return `${reachable.length} routes opened directly`;
  });

  await wf.run(`${n++}. Sign out invalidates the session`, async () => {
    const btn = page.getByRole('button', { name: /sign out/i }).first();
    if ((await btn.count()) === 0) throw new Error('no visible Sign out control');
    // Sign-out is a plain form POST to a route handler outside the middleware (audit PR-02).
    const disarm = diag.permitOne('student sign-out', '/api/session/sign-out', 'form-post');
    try {
      await btn.click();
      await page.waitForURL((u) => u.pathname.startsWith('/login'), { timeout: 20_000 });
    } finally {
      disarm();
    }
    await page.goto('/overview', { waitUntil: 'load' });
    expect(new URL(page.url()).pathname, 'session still valid after sign-out').toMatch(/^\/login/);
    return 'returned to /login; /overview now redirects to /login';
  });
}
