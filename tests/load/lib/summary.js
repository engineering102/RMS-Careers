// End-of-test summary: a Markdown table for the report plus the raw k6 JSON. Metrics only: no request bodies,
// headers, cookies or credentials ever reach `data`. Output paths come from LOAD_RESULTS_DIR + LOAD_RUN_ID.
import { summaryMarkdown } from './summary-format.js';

export function makeHandleSummary(scenario) {
  return function handleSummary(data) {
    const runId = __ENV.LOAD_RUN_ID || `${scenario}-${__ENV.LOAD_PROFILE || 'smoke'}`;
    const dir = __ENV.LOAD_RESULTS_DIR;
    const md = summaryMarkdown(data, {
      scenario,
      profile: __ENV.LOAD_PROFILE || 'smoke',
      runId,
      target: __ENV.STUDENT_BASE_URL || __ENV.WEB_BASE_URL || __ENV.ADMIN_BASE_URL || 'unknown'
    });
    const out = { stdout: `\n${md}\n` };
    if (dir) {
      out[`${dir}/${runId}.summary.json`] = JSON.stringify(data, null, 2);
      out[`${dir}/${runId}.summary.md`] = md;
    }
    return out;
  };
}
