// Custom k6 metrics. Created once in the init context (module scope), shared by every scenario.
import { Counter, Rate, Trend } from 'k6/metrics';

/** Sign-in latency (CSRF fetch + credentials callback), kept apart from page latency. */
export const loginDuration = new Trend('rms_login_duration', true);
export const loginSuccess = new Rate('rms_login_success');
/** Sign-ins refused by the per-IP / per-account limiter (expected when many VUs share one source IP). */
export const rateLimited = new Counter('rms_rate_limited');
/** Page rendered for THIS student (own name present, no error / not-found / login page). */
export const pageCorrect = new Rate('rms_page_correct');
/** Server Action round trip and its structured `{ success }` result. */
export const actionDuration = new Trend('rms_action_duration', true);
export const actionSuccess = new Rate('rms_action_success');
/** 1 when an access-control check held (anonymous redirected, foreign batch hidden, ...). Must stay at 100%. */
export const authzEnforced = new Rate('rms_authz_enforced');
/** VUs that had to sign in again mid-run because their session stopped working. */
export const sessionLost = new Counter('rms_session_lost');
