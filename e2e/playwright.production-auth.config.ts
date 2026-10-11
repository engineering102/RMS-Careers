/**
 * AUTHENTICATED production run (student portal, owner-authorized test account only).
 * Separate from the credential-free smoke (playwright.production.config.ts) and never run by it.
 *
 * Guard: still read-only by default. Only a single-use sign-in POST and a single-use sign-out POST,
 * both exact-path Server Actions on the fixed production origin, are permitted by the test code
 * (support/diagnostics.ts `permitOne`). The origin is fixed; there is no env override.
 *
 * Artifacts: traces are OFF (they record Cookie / Set-Cookie headers). Screenshots are taken on
 * failure only and may show the test student's name: inspect before sharing, store locally.
 */
import { defineConfig, devices } from '@playwright/test';
import { PRODUCTION_STUDENT_ORIGIN } from './support/targets';

process.env.E2E_SUITE = 'production-auth';

export default defineConfig({
  testDir: './tests/production-auth',
  outputDir: './test-results/production-auth',
  globalSetup: './support/global-setup.ts',
  globalTeardown: './support/global-teardown.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 10_000 },
  forbidOnly: true,
  reporter: [['list'], ['html', { open: 'never', outputFolder: './playwright-report/production-auth' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: PRODUCTION_STUDENT_ORIGIN,
    navigationTimeout: 30_000,
    actionTimeout: 10_000,
    serviceWorkers: 'block',
    acceptDownloads: false,
    permissions: [],
    screenshot: 'only-on-failure',
    trace: 'off',
    video: 'off'
  },
  projects: [{ name: 'production-auth', use: {} }]
});
