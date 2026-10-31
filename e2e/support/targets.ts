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

/** Origin of a loopback URL; anything else (another host, credentials, another scheme) throws. */
function resolveLoopbackBaseUrl(name: string, raw: string): string {
  const value = raw.trim();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} is not a valid URL.`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${name} must be http(s).`);
  }
  if (!LOCAL_HOSTS.has(url.hostname) || url.username || url.password) {
    throw new Error(
      `${name} must be a loopback host without credentials (localhost, 127.0.0.1, [::1]); got host "${url.hostname}".`
    );
  }
  return url.origin;
}

/**
 * Base URL of a locally running student app. Only loopback hosts are accepted, so the local
 * suite can never be pointed at a deployed environment by mistake.
 */
export function resolveLocalStudentBaseUrl(raw: string | undefined = process.env.E2E_STUDENT_BASE_URL): string {
  return resolveLoopbackBaseUrl('E2E_STUDENT_BASE_URL', raw ?? 'http://localhost:3002');
}

/** Base URL of a locally running tutor app (`pnpm dev:tutor`, port 3003). Loopback only, like the student one. */
export function resolveLocalTutorBaseUrl(raw: string | undefined = process.env.E2E_TUTOR_BASE_URL): string {
  return resolveLoopbackBaseUrl('E2E_TUTOR_BASE_URL', raw ?? 'http://localhost:3003');
}
