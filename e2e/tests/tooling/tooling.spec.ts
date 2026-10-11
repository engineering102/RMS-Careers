import { test, expect } from '../../support/diagnostics';
import { redactText, sanitizeUrl } from '../../support/redact';
import { resolveLocalStudentBaseUrl } from '../../support/targets';

// Needs no application and no network: proves the browser, the diagnostics layer and the guards.

test.describe('playwright tooling', () => {
  test('browser launches and renders', async ({ page, diag }) => {
    await page.setContent('<title>sanity</title><h1>RMS e2e sanity</h1>');
    await expect(page.getByRole('heading', { name: 'RMS e2e sanity' })).toBeVisible();
    await diag.inspect('setContent');
    expect(diag.criticalFindings()).toEqual([]);
  });

  test('diagnostics capture console errors, page errors and application-exception text', async ({ page, diag }) => {
    await page.setContent(
      `<h1>Application error: a client-side exception has occurred (see the browser console for more information).</h1>
       <script>console.error('synthetic console error'); setTimeout(() => { throw new Error('synthetic page error'); }, 0);</script>`
    );
    await page.waitForFunction(() => document.readyState === 'complete');
    await page.waitForTimeout(200); // let the deferred throw reach the pageerror listener
    await diag.inspect('synthetic');
    const findings = diag.criticalFindings();
    expect(findings.some((f) => f.includes('next-client-exception'))).toBe(true);
    expect(findings.some((f) => f.includes('synthetic page error'))).toBe(true);
  });

  test('read-only guard aborts non-GET requests', async ({ page }) => {
    await page.setContent('<p>guard</p>');
    // .invalid never resolves; the request is aborted by the guard before it could leave the browser.
    const outcome = await page.evaluate(() =>
      fetch('http://e2e-guard-probe.invalid/submit', { method: 'POST', body: 'x' }).then(
        () => 'sent',
        () => 'blocked'
      )
    );
    expect(outcome).toBe('blocked');
  });

  test('redaction removes tokens and query strings', () => {
    expect(sanitizeUrl('https://x.example/reset-password?token=abc123&x=1#frag')).toBe('https://x.example/reset-password');
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijk';
    expect(redactText(`Bearer ${jwt} and ${jwt}`)).not.toContain('eyJ');
    expect(redactText('postgres://user:pw@host/db')).toBe('postgres://[redacted]');
    expect(redactText('GET /a?token=secretvalue&b=1')).not.toContain('secretvalue');
  });

  test('local target resolver accepts only loopback hosts', () => {
    expect(resolveLocalStudentBaseUrl('http://localhost:3002/anything')).toBe('http://localhost:3002');
    expect(resolveLocalStudentBaseUrl('http://127.0.0.1:3002')).toBe('http://127.0.0.1:3002');
    for (const bad of ['https://student.rms-careers.com', 'http://192.168.1.5:3002', 'http://user:pw@localhost:3002', 'ftp://localhost', 'nonsense']) {
      expect(() => resolveLocalStudentBaseUrl(bad), bad).toThrow();
    }
  });
});
