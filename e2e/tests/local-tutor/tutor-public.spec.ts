import { test, expect } from '../../support/diagnostics';

// Public, unauthenticated, GET-only checks against a locally running tutor app (opt-in project, see
// playwright.local.config.ts). Nothing here signs in, fills a form or clicks a submit button.

test.beforeAll(async ({ baseURL }) => {
  try {
    // Generous timeout: a cold `next dev` compiles the route on first hit.
    const res = await fetch(`${baseURL}/login`, { redirect: 'manual', signal: AbortSignal.timeout(30_000) });
    if (res.status >= 500) throw new Error(`/login responded HTTP ${res.status}`);
  } catch (error) {
    throw new Error(
      `Tutor app at ${baseURL} is not healthy (${error instanceof Error ? error.message : 'unknown'}). ` +
        'Start it yourself (`pnpm dev:tutor`) against a database you have verified, then set E2E_TUTOR_BASE_URL to its loopback URL.'
    );
  }
});

test.describe('tutor portal (local, public)', () => {
  test('login page renders the sign-in form', async ({ page, diag }) => {
    await page.goto('/login');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await diag.inspect('/login');
    expect(diag.criticalFindings()).toEqual([]);
  });

  for (const route of ['/overview', '/reviews', '/batches', '/profile']) {
    test(`${route} redirects an anonymous visitor to /login`, async ({ page, diag }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login(\?|$)/);
      await diag.inspect(`${route} (anonymous)`);
      expect(diag.criticalFindings()).toEqual([]);
    });
  }

  test('the public recovery pages render', async ({ page, diag }) => {
    for (const route of ['/forgot-password', '/resend-activation']) {
      await page.goto(route);
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await diag.inspect(route);
    }
    expect(diag.criticalFindings()).toEqual([]);
  });
});
