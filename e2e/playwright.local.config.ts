/**
 * Local regression suite. Run with `pnpm test:e2e` (also :headed and :ui).
 *
 * Database safety: this config NEVER starts the application and never reads .env files. Start the
 * student app yourself (`pnpm dev:student`) against a database you have verified; the tests only
 * issue GET requests (everything else is aborted by support/diagnostics.ts) and never sign in, so
 * they cannot write to whatever database that app uses. Authenticated flows must wait for a
 * verified test database (see e2e/README.md); the guard in packages/db/src/guard.ts classifies
 * databases for Vitest and seeds only, it does not govern a running app.
 *
 * Projects:
 *   tooling       - proves Playwright and the diagnostics layer work; needs no app at all
 *   local-student - public/unauthenticated behaviour of the app at E2E_STUDENT_BASE_URL (loopback only)
 */
import { defineConfig, devices } from '@playwright/test';
import { resolveLocalStudentBaseUrl } from './support/targets';

process.env.E2E_SUITE = 'local';

const baseURL = resolveLocalStudentBaseUrl();

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results/local',
  globalSetup: './support/global-setup.ts',
  globalTeardown: './support/global-teardown.ts',
  fullyParallel: true,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never', outputFolder: './playwright-report/local' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    serviceWorkers: 'block',
    acceptDownloads: false,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off'
  },
  projects: [
    { name: 'tooling', testDir: './tests/tooling' },
    { name: 'local-student', testDir: './tests/local' }
  ]
});
