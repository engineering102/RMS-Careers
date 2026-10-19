# Load test report — <scenario(s)> — <YYYY-MM-DD>

> Copy to `docs/audits/load-test-<date>.md`. Every number must come from an artifact listed in §8. Write "not measured"
> rather than estimating. Keep measured facts (§3–§5) apart from interpretation (§6–§7).

## 1. What was tested

| Item | Value |
|---|---|
| Commit / build | `<sha>`, built with `<cf:build / next build>` |
| Target | `<origin>` — deployment type `<workerd local / staging Worker / next start>` |
| Database | NonProd `test` branch, endpoint verified by `<how>`; Neon compute `<min–max CU>`, pooled host `<yes/no>`, scale-to-zero `<on/off>` |
| Differences from production | `<region, plan, compute size, Smart Placement, cache rules, data volume>` |
| Generator | `<machine, cores, RAM, location, network>`; single IP `<yes/no>` |
| Fixture | `<N>` synthetic accounts in `<batch>`; content items `<n>` |
| Telemetry available | Cloudflare Workers analytics `<yes/no>`, Neon monitoring `<yes/no>`, `wrangler tail` `<yes/no>` |

## 2. Runs

| Run id | Scenario | Profile | Peak VUs | Duration | k6 exit | Generator peak CPU | Valid? |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

A run is **invalid** if the generator saturated, the target was mis-identified, or telemetry contradicts the numbers.

## 3. Results (from `results/*.summary.md`)

| Run | req/s | Failed % | p50 | p90 | p95 | p99 | Sign-in p95 | Rate-limited | Correct-page % | Authz % |
|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | |

### Slowest routes (p95, highest load that passed)

| Route | p95 | p99 | Failed % | Notes |
|---|---|---|---|---|

## 4. Server-side telemetry (same time window)

| Metric | Baseline | Peak of run | Source |
|---|---|---|---|
| Worker requests/s, errors | | | Cloudflare |
| Worker CPU time p50/p99 | | | Cloudflare |
| Worker wall time p50/p99 | | | Cloudflare |
| Neon CPU / compute CU | | | Neon |
| Neon active connections | | | Neon |
| Slowest queries (p95) | | | Neon / pg_stat_statements |

## 5. Browser verification (Playwright)

| Journey | Result | Navigation timing (LCP/TTFB) | Notes |
|---|---|---|---|

## 6. Findings (ranked)

| # | Severity | Finding | Evidence (run id, metric, telemetry) | Impact | Recommended remediation | Status |
|---|---|---|---|---|---|---|

Label each: **Measured** (reproduced, with numbers) or **Hypothesis** (needs more evidence).

## 7. Capacity assessment

- Highest load that passed every threshold with a valid generator: `<profile, VUs, req/s>`.
- First threshold that failed and why: `<metric, value, suspected bottleneck>`.
- What this does **not** show: `<browser, production region/compute, real data volume, multiple source IPs, ...>`.
- Next bottleneck to investigate: `<...>`.

## 8. Status of this work

| Category | Items |
|---|---|
| Implemented and tested | |
| Implemented, not executed | |
| Blocked (missing credentials / infrastructure) | |
| Changes requiring approval | |

Artifacts: `<paths to summary.json / generator.json / dashboard exports>`.
