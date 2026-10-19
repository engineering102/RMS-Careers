// Target and safety configuration for the k6 suite. Pure module (no k6 imports) so Node can unit-test it:
// scripts/ci/__tests__/load-test-lib.test.mjs. k6 passes `__ENV`, the tests pass a plain object.
//
// Safety rules enforced here (fail closed, before any request is sent):
//  * Every base URL must be http(s) with no embedded credentials; plain http only on loopback.
//  * Production hosts (*.rms-careers.com) are refused, except a read-only, unauthenticated, <= 5 VU smoke of the
//    public website when LOAD_ALLOW_PRODUCTION equals PRODUCTION_ACK exactly. Nothing else can reach production.
//  * Write scenarios (practice quiz, formal assessment) additionally need LOAD_ALLOW_WRITES=1.

export const PRODUCTION_ROOT_DOMAIN = 'rms-careers.com';
export const PRODUCTION_ACK = 'read-only-public-smoke';
export const PRODUCTION_MAX_VUS = 5;

/** Scenario catalogue: what each one needs and whether it writes. */
export const SCENARIOS = {
  'public-web': { needs: ['WEB_BASE_URL'], authenticated: false, writes: false, productionSafe: true },
  'auth-burst': { needs: ['STUDENT_BASE_URL'], authenticated: true, writes: false, productionSafe: false },
  'student-browse': { needs: ['STUDENT_BASE_URL'], authenticated: true, writes: false, productionSafe: false },
  'authz-boundaries': { needs: ['STUDENT_BASE_URL'], authenticated: true, writes: false, productionSafe: false },
  'practice-quiz': { needs: ['STUDENT_BASE_URL'], authenticated: true, writes: true, productionSafe: false },
  'formal-assessment': { needs: ['STUDENT_BASE_URL'], authenticated: true, writes: true, productionSafe: false },
  'admin-read': { needs: ['ADMIN_BASE_URL'], authenticated: true, writes: false, productionSafe: false }
};

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

export class LoadConfigError extends Error {}

// Worker names of the production apps (`name` in each app's wrangler.jsonc, plus the planned tutor portal).
export const PRODUCTION_WORKERS = ['rms-web', 'rms-student', 'rms-admin', 'rms-tutor'];

export function isProductionHost(hostname) {
  const h = String(hostname).toLowerCase().replace(/\.$/, '');
  if (h === PRODUCTION_ROOT_DOMAIN || h.endsWith(`.${PRODUCTION_ROOT_DOMAIN}`)) return true;
  // The production Workers may also answer on <name>.<account>.workers.dev and on version previews
  // <version>-<name>.<account>.workers.dev. A staging Worker must use a different name (e.g. rms-student-staging).
  if (h.endsWith('.workers.dev')) {
    const first = h.split('.')[0];
    return PRODUCTION_WORKERS.some((w) => first === w || first.endsWith(`-${w}`));
  }
  return false;
}

/** Highest VU count any scenario in a final k6 options object can reach. Pure. */
export function peakVus(scenarios) {
  let peak = 0;
  for (const s of Object.values(scenarios ?? {})) {
    const stageMax = Math.max(0, ...((s?.stages ?? []).map((x) => Number(x?.target) || 0)));
    peak = Math.max(peak, Number(s?.vus) || 0, Number(s?.startVUs) || 0, Number(s?.maxVUs) || 0, Number(s?.preAllocatedVUs) || 0, stageMax);
  }
  return peak;
}

/**
 * Runtime check of the shape k6 actually runs. CLI shortcuts (--vus, --duration, --iterations, --stages) replace
 * the script's scenarios, which would bypass the profile and the production VU cap that resolveConfig checked.
 * Returns an error message, or null when the run matches what the script built.
 */
export function checkRunShape(finalScenarios, expected) {
  const names = Object.keys(finalScenarios ?? {});
  if (names.length !== 1 || names[0] !== expected.scenario) {
    return `The run shape was overridden (scenarios: ${names.join(', ') || 'none'}). Do not pass --vus/--duration/--iterations/--stages; use LOAD_PROFILE, LOAD_VUS, LOAD_RAMP and LOAD_HOLD.`;
  }
  const peak = peakVus(finalScenarios);
  if (peak > expected.maxVus) return `The run would reach ${peak} VUs, above the ${expected.maxVus} this configuration allows.`;
  if (expected.production && peak > PRODUCTION_MAX_VUS) return `Production allows at most ${PRODUCTION_MAX_VUS} VUs; this run would reach ${peak}.`;
  return null;
}

export function isLoopbackHost(hostname) {
  return LOOPBACK.has(String(hostname).toLowerCase());
}

/**
 * Minimal URL parser. k6's goja runtime has no WHATWG `URL` global, so this does not rely on one.
 * Returns { protocol, hostname, origin } or throws.
 */
export function parseBaseUrl(name, raw) {
  const value = String(raw ?? '').trim();
  const m = value.match(/^(https?):\/\/([^/?#]*)(\/[^?#]*)?$/i);
  if (!m) throw new LoadConfigError(`${name} must be an absolute http(s) URL without query or fragment.`);
  const protocol = m[1].toLowerCase();
  const authority = m[2];
  if (authority.includes('@')) throw new LoadConfigError(`${name} must not contain credentials.`);
  const hostname = authority.startsWith('[') ? authority.slice(0, authority.indexOf(']') + 1) : authority.split(':')[0];
  if (!hostname) throw new LoadConfigError(`${name} has no host.`);
  const path = (m[3] ?? '').replace(/\/+$/, '');
  if (path) throw new LoadConfigError(`${name} must be an origin (no path); got a path component.`);
  if (protocol === 'http' && !isLoopbackHost(hostname)) {
    throw new LoadConfigError(`${name}: plain http is only allowed for loopback hosts; use https.`);
  }
  return { protocol, hostname: hostname.toLowerCase(), origin: `${protocol}://${authority.toLowerCase()}` };
}

function positiveInt(name, raw, fallback) {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw new LoadConfigError(`${name} must be a positive integer.`);
  return n;
}

/**
 * Resolve and validate the run configuration.
 * @param {Record<string, string | undefined>} env  k6 `__ENV` or a test object
 * @param {{ scenario: string, profile: string, maxVus: number }} run  the scenario being started and its peak VUs
 */
export function resolveConfig(env, run) {
  const scenario = SCENARIOS[run.scenario];
  if (!scenario) throw new LoadConfigError(`Unknown scenario "${run.scenario}". Known: ${Object.keys(SCENARIOS).join(', ')}.`);

  const urls = {};
  for (const name of scenario.needs) {
    if (!env[name]) throw new LoadConfigError(`${name} is required for scenario "${run.scenario}".`);
    urls[name] = parseBaseUrl(name, env[name]);
  }

  const production = Object.values(urls).some((u) => isProductionHost(u.hostname));
  if (production) {
    const reasons = [];
    if (env.LOAD_ALLOW_PRODUCTION !== PRODUCTION_ACK) reasons.push(`LOAD_ALLOW_PRODUCTION is not "${PRODUCTION_ACK}"`);
    if (!scenario.productionSafe) reasons.push(`scenario "${run.scenario}" is not production-safe`);
    if (run.profile !== 'smoke') reasons.push(`profile "${run.profile}" is not "smoke"`);
    if (run.maxVus > PRODUCTION_MAX_VUS) reasons.push(`${run.maxVus} VUs exceeds ${PRODUCTION_MAX_VUS}`);
    if (reasons.length) throw new LoadConfigError(`Refusing a production target: ${reasons.join('; ')}.`);
  }

  if (scenario.writes) {
    if (env.LOAD_ALLOW_WRITES !== '1') {
      throw new LoadConfigError(`Scenario "${run.scenario}" writes data; set LOAD_ALLOW_WRITES=1 (non-production targets only).`);
    }
  }

  return {
    scenario: run.scenario,
    profile: run.profile,
    production,
    writes: scenario.writes,
    web: urls.WEB_BASE_URL?.origin,
    student: urls.STUDENT_BASE_URL?.origin,
    admin: urls.ADMIN_BASE_URL?.origin,
    thinkMin: positiveInt('LOAD_THINK_MIN_S', env.LOAD_THINK_MIN_S, 5),
    thinkMax: positiveInt('LOAD_THINK_MAX_S', env.LOAD_THINK_MAX_S, 20),
    burstWindowS: positiveInt('LOAD_BURST_WINDOW_S', env.LOAD_BURST_WINDOW_S, 180)
  };
}
