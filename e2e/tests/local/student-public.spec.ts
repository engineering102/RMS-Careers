import { test, expect } from '../../support/diagnostics';

// Public, unauthenticated, GET-only checks against a locally running student app.
// The app is started by the developer (see playwright.local.config.ts); nothing here signs in,
// fills a form or clicks a submit button, so no database write can originate from these tests.

test.beforeAll(async ({ baseURL }) => {
  try {
    // Generous timeout: a cold `next dev` compiles the route on first hit.
    const res = await fetch(`${baseURL}/login`, { redirect: 'manual', signal: AbortSignal.timeout(30_000) });
    if (res.status >= 500) throw new Error(`/login responded HTTP ${res.status}`);
  } catch (error) {
    throw new Error(
      `Student app at ${baseURL} is not healthy (${error instanceof Error ? error.message : 'unknown'}). ` +
        'Start (or restart) it yourself against a database you have verified, or set E2E_STUDENT_BASE_URL to another loopback URL.'
    );
  }
});

test.describe('student portal (local, public)', () => {
  test('login page renders the sign-in form', async ({ page, diag }) => {
    await page.goto('/login');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await diag.inspect('/login');
    expect(diag.criticalFindings()).toEqual([]);
  });

  test('protected route redirects an anonymous visitor to /login', async ({ page, diag }) => {
    await page.goto('/overview');
    await expect(page).toHaveURL(/\/login(\?|$)/);
    await diag.inspect('/overview (anonymous)');
    expect(diag.criticalFindings()).toEqual([]);
  });
});
