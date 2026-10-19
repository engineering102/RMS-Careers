// Pure formatter for the k6 summary object (unit-tested in scripts/ci/__tests__/load-test-lib.test.mjs).

const ms = (v) => (typeof v === 'number' ? `${v.toFixed(0)} ms` : '–');
const pct = (v) => (typeof v === 'number' ? `${(v * 100).toFixed(2)} %` : '–');
const num = (v, d = 1) => (typeof v === 'number' ? v.toFixed(d) : '–');

function thresholdRows(metrics) {
  const rows = [];
  for (const [name, m] of Object.entries(metrics)) {
    for (const [expr, t] of Object.entries(m.thresholds ?? {})) {
      // The always-true per-route thresholds only exist to create submetrics; leave them out.
      if (expr === 'max>=0' || expr === 'rate>=0') continue;
      rows.push(`| \`${name}\` | \`${expr}\` | ${t.ok ? 'PASS' : '**FAIL**'} |`);
    }
  }
  return rows;
}

function routeRows(metrics) {
  const rows = [];
  for (const [name, m] of Object.entries(metrics)) {
    const r = name.match(/^http_req_duration\{name:(.+)\}$/);
    if (!r) continue;
    const failed = metrics[`http_req_failed{name:${r[1]}}`]?.values?.rate;
    const v = m.values ?? {};
    rows.push(`| \`${r[1]}\` | ${v.count ?? '–'} | ${ms(v.med)} | ${ms(v['p(90)'])} | ${ms(v['p(95)'])} | ${ms(v['p(99)'])} | ${ms(v.max)} | ${pct(failed)} |`);
  }
  return rows.sort();
}

export function summaryMarkdown(data, meta) {
  const m = data.metrics ?? {};
  const v = (name) => m[name]?.values ?? {};
  const dur = v('http_req_duration');
  const lines = [
    `## Load test: ${meta.scenario} / ${meta.profile}`,
    '',
    `Run \`${meta.runId}\` against \`${meta.target}\`. Test duration ${num((data.state?.testRunDurationMs ?? 0) / 1000, 0)} s, peak VUs ${v('vus_max').max ?? v('vus_max').value ?? '–'}.`,
    '',
    '| Metric | Value |',
    '|---|---|',
    `| Requests | ${v('http_reqs').count ?? 0} (${num(v('http_reqs').rate)} req/s) |`,
    `| Iterations | ${v('iterations').count ?? 0} (${num(v('iterations').rate, 2)} /s) |`,
    `| HTTP failure rate | ${pct(v('http_req_failed').rate)} |`,
    `| Checks passed | ${pct(v('checks').rate)} |`,
    `| Latency p50 / p90 / p95 / p99 | ${ms(dur.med)} / ${ms(dur['p(90)'])} / ${ms(dur['p(95)'])} / ${ms(dur['p(99)'])} |`,
    `| Server wait (TTFB) p95 | ${ms(v('http_req_waiting')['p(95)'])} |`,
    `| Connect p95 / TLS p95 | ${ms(v('http_req_connecting')['p(95)'])} / ${ms(v('http_req_tls_handshaking')['p(95)'])} |`,
    `| Sign-in p95 (success rate) | ${ms(v('rms_login_duration')['p(95)'])} (${pct(v('rms_login_success').rate)}) |`,
    `| Rate-limited sign-ins | ${v('rms_rate_limited').count ?? 0} |`,
    `| Sessions lost mid-run | ${v('rms_session_lost').count ?? 0} |`,
    `| Correct page for this student | ${pct(v('rms_page_correct').rate)} |`,
    `| Server Action p95 (success rate) | ${ms(v('rms_action_duration')['p(95)'])} (${pct(v('rms_action_success').rate)}) |`,
    `| Access control enforced | ${pct(v('rms_authz_enforced').rate)} |`,
    `| Data received / sent | ${num((v('data_received').count ?? 0) / 1e6)} MB / ${num((v('data_sent').count ?? 0) / 1e6)} MB |`,
    ''
  ];
  const routes = routeRows(m);
  if (routes.length) {
    lines.push('### Per route', '', '| Route | Requests | p50 | p90 | p95 | p99 | max | Failed |', '|---|---|---|---|---|---|---|---|', ...routes, '');
  }
  const th = thresholdRows(m);
  if (th.length) lines.push('### Thresholds (provisional targets)', '', '| Metric | Threshold | Result |', '|---|---|---|', ...th, '');
  lines.push('_HTTP-level measurement from the load generator: not browser navigation time, not Worker CPU, not Neon telemetry._');
  return lines.join('\n');
}
