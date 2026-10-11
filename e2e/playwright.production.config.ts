/**
 * READ-ONLY production smoke suite for https://student.rms-careers.com.
 *
 * Run with `pnpm test:e2e:prod`. It is intentionally NOT part of `pnpm test`, `pnpm test:e2e` or CI:
 * it visits public pages with GET only (all other methods are aborted in support/diagnostics.ts),
 * never signs in, never submits a form, and has no credentials. Retries are off so a failure is
 * reported once and exactly as observed. The origin is fixed (no env override).
 */
import { defineConfig, devices } from '@playwright/test';
import { PRODUCTION_ADMIN_ORIGIN, PRODUCTION_STUDENT_ORIGIN } from './support/targets';

process.env.E2E_SUITE = 'production';

export default defineConfig({
  testDir: './tests/production',
  outputDir: './test-results/production',
  globalSetup: './support/global-setup.ts',
  globalTeardown: './support/global-teardown.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: true,
  reporter: [['list'], ['html', { open: 'never', outputFolder: './playwright-report/production' }]],
  use: {
    ...devices['Desktop Chrome'],
    navigationTimeout: 30_000,
    actionTimeout: 10_000,
    serviceWorkers: 'block',
    acceptDownloads: false,
    permissions: [],
    screenshot: 'only-on-failure',
    // Traces include request/response headers. This suite is unauthenticated, so there are no
    // session tokens to leak, but do not share traces publicly (see e2e/README.md).
    trace: 'retain-on-failure',
    video: 'off'
  },
  // Fixed origins, no env override. Each project only runs the specs named for it.
  projects: [
    { name: 'production', testMatch: 'student-*.spec.ts', use: { baseURL: PRODUCTION_STUDENT_ORIGIN } },
    { name: 'production-admin', testMatch: 'admin-*.spec.ts', use: { baseURL: PRODUCTION_ADMIN_ORIGIN } }
  ]
});
