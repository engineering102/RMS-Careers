import { test, expect } from '../../support/diagnostics';

/**
 * Read-only production smoke test for https://student.rms-careers.com.
 *
 * Public pages only, GET only (support/diagnostics.ts aborts every other method), no sign-in, no
 * form interaction. It does not assume HTTP 200: the status and redirect chain are RECORDED, and
 * the test fails only on an application exception, an uncaught page error, a 5xx document or a
 * failed first-party script/stylesheet. Console warnings and other failed requests are reported
 * but do not fail the test. Evidence lands in e2e/reports/production/ (SUMMARY.md + JSON) and
 * in the HTML report; read it even when the run is green.
 */
const PUBLIC_PATHS = ['/', '/login', '/forgot-password', '/overview'];

for (const path of PUBLIC_PATHS) {
  test(`student portal ${path} loads without an application exception`, async ({ page, diag }) => {
    await page.goto(path, { waitUntil: 'load' });
    // Give hydration and any client-side error boundary time to appear; a busy page is not a failure.
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
    await page.waitForTimeout(1500);
    await diag.inspect(path);
    expect(diag.criticalFindings(), `diagnostics for ${path}`).toEqual([]);
  });
}
