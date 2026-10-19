// PROVISIONAL engineering thresholds (pure module). These are starting targets chosen from the static capacity
// model in docs/audits/scale-and-security-audit-2026-10.md, NOT measured results and NOT business requirements.
// Revisit them once a baseline exists (docs/audits/load-testing-2026-10.md section 6).
//
// Requests are tagged with `kind` (bounded set below) and `name` (a route template such as /content/:id), so
// thresholds and summaries stay low-cardinality no matter how many ids a run touches.

export const KINDS = ['public', 'auth', 'page', 'action', 'authz'];

const base = {
  // Hard stop: a run that is mostly failing is not producing useful data and may be hurting a shared dependency.
  http_req_failed: [{ threshold: 'rate<0.01' }, { threshold: 'rate<0.10', abortOnFail: true, delayAbortEval: '30s' }],
  checks: ['rate>0.99']
};

const byScenario = {
  'public-web': {
    'http_req_duration{kind:public}': ['p(95)<800', 'p(99)<1500']
  },
  'auth-burst': {
    // bcryptjs cost 12 in a Worker is ~200-400 ms CPU per sign-in before any network time.
    rms_login_duration: ['p(95)<2000', 'p(99)<4000'],
    rms_login_success: ['rate>0.99'],
    rms_rate_limited: ['count<1']
  },
  'student-browse': {
    'http_req_duration{kind:page}': ['p(95)<1500', 'p(99)<3000'],
    rms_login_success: ['rate>0.99'],
    rms_page_correct: ['rate>0.99']
  },
  'authz-boundaries': {
    rms_authz_enforced: ['rate==1'],
    'http_req_duration{kind:authz}': ['p(95)<1500']
  },
  'practice-quiz': {
    rms_action_duration: ['p(95)<2000', 'p(99)<4000'],
    rms_action_success: ['rate>0.99']
  },
  'formal-assessment': {
    rms_action_duration: ['p(95)<3000', 'p(99)<6000'],
    rms_action_success: ['rate>0.99']
  },
  'admin-read': {
    'http_req_duration{kind:page}': ['p(95)<2000', 'p(99)<4000'],
    rms_login_success: ['rate>0.99']
  }
};

export function thresholdsFor(scenario) {
  return { ...base, ...(byScenario[scenario] ?? {}) };
}
