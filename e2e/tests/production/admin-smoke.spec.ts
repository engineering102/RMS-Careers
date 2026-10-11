import { test, expect } from '../../support/diagnostics';

/**
 * Read-only, signed-out smoke of the production ADMIN portal (https://admin.rms-careers.com, the
 * `routes[].pattern` of apps/admin/wrangler.jsonc). No sign-in, no form submission, GET only.
 * Admin credentials have not been provided, so this says nothing about the post-login flow.
 */
test('admin /login renders the sign-in form without an application exception', async ({ page, diag }) => {
  await page.goto('/login', { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  await expect(page.locator('input[name="username"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await diag.inspect('/login');
  expect(diag.criticalFindings(), 'diagnostics for admin /login').toEqual([]);
});

test('admin protected route redirects an anonymous visitor to /login', async ({ page, diag }) => {
  await page.goto('/programs', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await expect(page).toHaveURL(/\/login(\?|$)/);
  await diag.inspect('/programs (anonymous)');
  expect(diag.criticalFindings(), 'diagnostics for admin /programs (anonymous)').toEqual([]);
});
