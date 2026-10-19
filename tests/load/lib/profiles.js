// Load profiles (pure module). Each profile is a k6 `ramping-vus` stage list with explicit ramp-up and
// ramp-down. Override with LOAD_VUS (peak VUs), LOAD_RAMP and LOAD_HOLD (k6 durations, e.g. 90s, 5m).
//
// A "VU" is a scripted student, not a human: each one waits LOAD_THINK_MIN_S..LOAD_THINK_MAX_S seconds between
// pages (default 5-20 s, mean 12.5 s), so N VUs generate roughly N / 12.5 page views per second plus their
// sub-requests. Read the resulting request rate from the summary, not the VU count, when comparing runs.

export const PROFILES = {
  smoke: { vus: 3, ramp: '10s', hold: '30s', down: '5s' },
  baseline: { vus: 50, ramp: '1m', hold: '3m', down: '30s' },
  intermediate: { vus: 250, ramp: '3m', hold: '5m', down: '1m' },
  peak: { vus: 500, ramp: '5m', hold: '10m', down: '1m' },
  target: { vus: 1000, ramp: '10m', hold: '10m', down: '2m' },
  soak: { vus: 300, ramp: '5m', hold: '45m', down: '2m' },
  // Class start: a quiet floor, then the whole cohort arrives within a minute.
  spike: { vus: 1000, floor: 50, ramp: '1m', hold: '3m', down: '30s' }
};

/** Order in which the staged runner climbs. It never advances past a failed stage. */
export const STAGE_ORDER = ['smoke', 'baseline', 'intermediate', 'peak', 'target'];

const DURATION = /^\d+(ms|s|m|h)$/;

export function assertDuration(name, value) {
  if (!DURATION.test(String(value))) throw new Error(`${name} must be a k6 duration such as 30s or 5m (got "${value}").`);
  return value;
}

/** @returns {{ name: string, vus: number, stages: {duration: string, target: number}[] }} */
export function buildProfile(name, env = {}) {
  const base = PROFILES[name];
  if (!base) throw new Error(`Unknown profile "${name}". Known: ${Object.keys(PROFILES).join(', ')}.`);
  const vus = env.LOAD_VUS ? Number(env.LOAD_VUS) : base.vus;
  if (!Number.isInteger(vus) || vus < 1) throw new Error('LOAD_VUS must be a positive integer.');
  const ramp = assertDuration('LOAD_RAMP', env.LOAD_RAMP || base.ramp);
  const hold = assertDuration('LOAD_HOLD', env.LOAD_HOLD || base.hold);
  const down = base.down;

  if (name === 'spike') {
    const floor = Math.min(base.floor, vus);
    return {
      name,
      vus,
      stages: [
        { duration: '30s', target: floor },
        { duration: '2m', target: floor },
        { duration: ramp, target: vus },
        { duration: hold, target: vus },
        { duration: '30s', target: floor },
        { duration: '1m', target: floor },
        { duration: down, target: 0 }
      ]
    };
  }
  return {
    name,
    vus,
    stages: [
      { duration: ramp, target: vus },
      { duration: hold, target: vus },
      { duration: down, target: 0 }
    ]
  };
}

/** Next stage the staged runner may run after `name` passed, or null at the top. */
export function nextStage(name) {
  const i = STAGE_ORDER.indexOf(name);
  return i >= 0 && i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : null;
}
