/**
 * Target allow-lists for browser tests. Both resolvers FAIL CLOSED and never read env files
 * (same rule as the Vitest tiers, see docs/development/testing.md).
 */

/** The only origin the production smoke suite may visit. The hyphenated domain is mandatory. */
export const PRODUCTION_STUDENT_ORIGIN = 'https://student.rms-careers.com';

/**
 * Admin portal origin. Source of truth: apps/admin/wrangler.jsonc `routes[].pattern`
 * (custom_domain). tests/tooling asserts this constant still matches that file.
 */
export const PRODUCTION_ADMIN_ORIGIN = 'https://admin.rms-careers.com';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Base URL of a locally running student app. Only loopback hosts are accepted, so the local
 * suite can never be pointed at a deployed environment by mistake.
 */
export function resolveLocalStudentBaseUrl(raw: string | undefined = process.env.E2E_STUDENT_BASE_URL): string {
  const value = (raw ?? 'http://localhost:3002').trim();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('E2E_STUDENT_BASE_URL is not a valid URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('E2E_STUDENT_BASE_URL must be http(s).');
  }
  if (!LOCAL_HOSTS.has(url.hostname) || url.username || url.password) {
    throw new Error(
      `E2E_STUDENT_BASE_URL must be a loopback host without credentials (localhost, 127.0.0.1, [::1]); got host "${url.hostname}".`
    );
  }
  return url.origin;
}
