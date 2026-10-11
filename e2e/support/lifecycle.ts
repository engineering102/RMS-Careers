/**
 * Global setup/teardown shared by both configs. The suite name comes from E2E_SUITE, which each
 * config sets for itself before Playwright loads these modules (they run in the same process).
 *
 *  setup    -> remove this suite's previous generated reports (only inside e2e/reports/<suite>)
 *  teardown -> merge per-test diagnostics JSON into e2e/reports/<suite>/SUMMARY.md
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { REPORT_ROOT } from './diagnostics';

function suiteDir(): string {
  const suite = process.env.E2E_SUITE;
  if (!suite || !/^[a-z-]+$/.test(suite)) throw new Error('E2E_SUITE is not set to a simple suite name.');
  const dir = path.join(REPORT_ROOT, suite);
  if (path.dirname(dir) !== REPORT_ROOT) throw new Error('Refusing to touch a path outside e2e/reports.');
  return dir;
}

export function setup(): void {
  const dir = suiteDir();
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

interface Saved {
  test: string;
  target: string;
  status: string;
  finishedAt: string;
  criticalFindings: string[];
  navigations: Array<{ status: number; url: string; redirectTo?: string }>;
  pageErrors: Array<{ name: string; message: string }>;
  console: { errorCount: number; warningCount: number; errors: Array<{ text: string }> };
  failedRequests: unknown[];
  httpErrors: Array<{ status: number; method: string; url: string }>;
  blockedNonReadOnlyRequests: unknown[];
}

export function teardown(): void {
  const dir = suiteDir();
  if (!existsSync(dir)) return;
  const reports = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as Saved);
  if (reports.length === 0) return;
  const lines = [`# ${process.env.E2E_SUITE} diagnostics summary`, '', `Generated ${new Date().toISOString()} (secrets, headers, cookies and bodies are never recorded).`, ''];
  lines.push('| Test | Status | Critical | Console errors | Failed req. | HTTP>=400 | Page errors |', '|---|---|---|---|---|---|---|');
  for (const r of reports) {
    lines.push(`| ${r.test} | ${r.status} | ${r.criticalFindings.length} | ${r.console.errorCount} | ${r.failedRequests.length} | ${r.httpErrors.length} | ${r.pageErrors.length} |`);
  }
  for (const r of reports) {
    lines.push('', `## ${r.test}`, `Target: ${r.target}`, '');
    lines.push('Navigations: ' + (r.navigations.map((n) => `${n.status} ${n.url}${n.redirectTo ? ` -> ${n.redirectTo}` : ''}`).join(' ; ') || 'none'));
    if (r.criticalFindings.length) lines.push('', 'Critical:', ...r.criticalFindings.map((f) => `- ${f}`));
    if (r.pageErrors.length) lines.push('', 'Page errors:', ...r.pageErrors.map((e) => `- ${e.name}: ${e.message}`));
    if (r.console.errors.length) lines.push('', 'Console errors:', ...r.console.errors.slice(0, 10).map((e) => `- ${e.text}`));
    if (r.httpErrors.length) lines.push('', 'HTTP >= 400:', ...r.httpErrors.slice(0, 10).map((e) => `- ${e.status} ${e.method} ${e.url}`));
  }
  writeFileSync(path.join(dir, 'SUMMARY.md'), lines.join('\n') + '\n');
}
