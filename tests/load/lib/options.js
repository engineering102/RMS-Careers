// Builds k6 `options` for a scenario from LOAD_PROFILE / LOAD_VUS / LOAD_RAMP / LOAD_HOLD and validates the
// target before the first request (config.js). Every scenario file calls this in its init context.
import exec from 'k6/execution';
import { checkRunShape, resolveConfig } from './config.js';
import { buildProfile } from './profiles.js';
import { thresholdsFor } from './thresholds.js';

const TREND_STATS = ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max', 'count'];

/**
 * @param {string} scenario
 * @param {{ executor?: 'ramping-vus'|'once-per-vu', routes?: string[], maxVusCap?: number }} shape
 */
export function scenarioSetup(scenario, shape = {}) {
  const profileName = __ENV.LOAD_PROFILE || 'smoke';
  const profile = buildProfile(profileName, __ENV);
  const vus = shape.maxVusCap ? Math.min(profile.vus, shape.maxVusCap) : profile.vus;
  const config = resolveConfig(__ENV, { scenario, profile: profileName, maxVus: vus });

  // Per-route submetrics. A threshold that always passes makes k6 report p95/p99 per route in the summary;
  // route names are templates (/content/:id), so cardinality stays bounded.
  const thresholds = thresholdsFor(scenario);
  for (const route of shape.routes ?? []) {
    thresholds[`http_req_duration{name:${route}}`] = ['max>=0'];
    thresholds[`http_req_failed{name:${route}}`] = ['rate>=0'];
  }

  let executor;
  if (shape.executor === 'once-per-vu') {
    // Burst shapes (sign-in at lab start, quiz deadline): every VU runs its journey exactly once.
    executor = { executor: 'per-vu-iterations', vus, iterations: 1, maxDuration: `${config.burstWindowS + 600}s` };
  } else {
    const stages = profile.stages.map((s) => ({ duration: s.duration, target: Math.min(s.target, vus) }));
    executor = { executor: 'ramping-vus', startVUs: 0, stages, gracefulRampDown: '30s', gracefulStop: '30s' };
  }

  // Re-checked in k6's setup(), against the options k6 actually runs (CLI flags included), before any iteration.
  const guard = () => {
    const problem = checkRunShape(exec.test.options.scenarios, { scenario, maxVus: vus, production: config.production });
    if (problem) exec.test.abort(`[rms-load] refused: ${problem}`);
  };

  return {
    config,
    vus,
    guard,
    options: {
      scenarios: { [scenario]: { ...executor, tags: { scenario } } },
      thresholds,
      summaryTrendStats: TREND_STATS,
      // Never let the summary or logs carry request bodies; keep bodies only where checks need them.
      discardResponseBodies: false,
      userAgent: `rms-load-test/1 (k6; ${scenario})`,
      noConnectionReuse: false,
      insecureSkipTLSVerify: false,
      tags: { profile: profileName }
    }
  };
}

export function thinkSeconds(config) {
  return config.thinkMin + Math.random() * Math.max(0, config.thinkMax - config.thinkMin);
}
