/**
 * Shared Playwright fixture: read-only guard + failure diagnostics.
 *
 * What is recorded (all redacted, see redact.ts): console errors/warnings, uncaught page errors,
 * failed requests, HTTP >= 400 responses, main-frame navigations, and text markers of a Next.js
 * application exception. What is NEVER recorded: request/response headers (except the
 * redirect `Location`, sanitized), cookies, storage, request/response bodies.
 *
 * Read-only guard: every request that is not GET/HEAD is aborted before it leaves the browser and
 * listed in the report. This holds for the production AND the local suite, so a browser test can
 * never submit a form or invoke a Server Action against whatever database the target app uses.
 *
 * Pass/fail policy (deliberately narrow; the full picture is always in the attached report):
 *   fails  -> application-exception markers, uncaught page errors, a 5xx main document,
 *             a failed first-party script/stylesheet
 *   report -> console errors/warnings, other failed requests, 4xx/3xx responses
 */
import { test as base, expect, type Page, type Request } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { redactText, sanitizeUrl } from './redact';

export const REPORT_ROOT = path.resolve(__dirname, '..', 'reports');

const SAFE_METHODS = new Set(['GET', 'HEAD']);
const MAX_ITEMS = 50;
const MAX_REQUESTS = 200;

/** A single-use exception to the read-only guard (see `Diagnostics.permitOne`). */
export interface WritePermit {
  label: string;
  /** Exact path on the project's own origin, e.g. '/login'. */
  pathname: string;
  /**
   * 'server-action' (default): must carry a `next-action` header (sign-in form).
   * 'form-post': a plain same-origin form POST to the exact path (student sign-out is a route handler
   * at /api/session/sign-out since audit PR-02, so it has no `next-action` header).
   */
  kind?: 'server-action' | 'form-post';
  used: boolean;
}

/**
 * Pure decision used by the route guard (unit-tested in tests/tooling):
 *  - GET/HEAD                         -> allow
 *  - the ONE armed, unused permit     -> permit (POST + `next-action` header [a Next.js Server Action]
 *                                        + exact origin + exact pathname)
 *  - everything else                  -> block
 */
export function decideRequest(
  req: { method: string; url: string; headers: Record<string, string> },
  baseOrigin: string,
  permit: WritePermit | null
): 'allow' | 'permit' | 'block' {
  if (SAFE_METHODS.has(req.method)) return 'allow';
  if (!permit || permit.used || req.method !== 'POST') return 'block';
  let url: URL;
  try {
    url = new URL(req.url);
  } catch {
    return 'block';
  }
  if (url.origin !== baseOrigin || url.pathname !== permit.pathname) return 'block';
  if ((permit.kind ?? 'server-action') === 'server-action' && !('next-action' in req.headers)) return 'block';
  return 'permit';
}

function classify(contentType: string | undefined, rscHeader: boolean): string {
  const ct = (contentType ?? '').toLowerCase();
  if (ct.includes('text/x-component') || rscHeader) return 'rsc';
  if (ct.includes('html')) return 'html';
  if (ct.includes('json')) return 'json';
  if (ct.includes('javascript')) return 'js';
  if (ct.includes('css')) return 'css';
  return ct ? 'other' : 'none';
}

const EXCEPTION_MARKERS: Array<[string, RegExp]> = [
  ['next-client-exception', /Application error: a client-side exception has occurred/i],
  ['next-server-exception', /Application error: a server-side exception has occurred/i],
  ['internal-server-error-page', /Internal Server Error/i],
  ['error-digest', /\bDigest:\s*\d+/i],
  ['error-boundary-dashboard', /Unable to load dashboard/i],
  ['error-boundary-generic', /Something went wrong/i]
];

interface Entry {
  [key: string]: string | number | undefined;
}

export interface Diagnostics {
  /** Visit nothing; inspect the current page for exception markers and record its final state. */
  inspect(label: string, opts?: { sampleText?: boolean }): Promise<void>;
  /**
   * Arm ONE POST to `pathname` on this project's own origin that carries a `next-action` header
   * (a Server Action: the sign-in / sign-out forms). Everything else stays blocked. Returns a
   * disarm function; a permit that was never used is dropped. Only for explicitly authorized
   * accounts and actions; never call it for password reset, activation or any mutation.
   */
  permitOne(label: string, pathname: string, kind?: WritePermit['kind']): () => void;
  /** Findings that should fail a smoke test (see policy above). Empty when healthy. */
  criticalFindings(): string[];
  readonly report: Record<string, unknown>;
}

function push<T>(list: T[], item: T): void {
  if (list.length < MAX_ITEMS) list.push(item);
}

export const test = base.extend<{ diag: Diagnostics }>({
  diag: [
    async ({ page, context, baseURL }, use, testInfo) => {
      const baseOrigin = new URL(String(baseURL)).origin;
      let permit: WritePermit | null = null;
      const permittedWrites: Entry[] = [];
      const requestLog: Entry[] = [];
      const consoleErrors: Entry[] = [];
      const consoleWarnings: Entry[] = [];
      let warningCount = 0;
      let errorCount = 0;
      let guardInducedErrors = 0;
      const pageErrors: Entry[] = [];
      const failedRequests: Entry[] = [];
      const httpErrors: Entry[] = [];
      const navigations: Entry[] = [];
      const blockedMethods: Entry[] = [];
      const inspections: Record<string, unknown>[] = [];
      const blocked = new WeakSet<Request>();

      await context.route('**/*', async (route) => {
        const request = route.request();
        const decision = decideRequest(
          { method: request.method(), url: request.url(), headers: request.headers() },
          baseOrigin,
          permit
        );
        if (decision === 'allow') return route.fallback();
        if (decision === 'permit' && permit) {
          permit.used = true;
          push(permittedWrites, { label: permit.label, method: request.method(), url: sanitizeUrl(request.url()) });
          return route.fallback();
        }
        blocked.add(request);
        push(blockedMethods, { method: request.method(), url: sanitizeUrl(request.url()) });
        return route.abort('blockedbyclient');
      });

      page.on('console', (msg) => {
        const type = msg.type();
        if (type !== 'error' && type !== 'warning') return;
        const loc = msg.location();
        const entry: Entry = { text: redactText(msg.text()), source: loc.url ? sanitizeUrl(loc.url) : undefined };
        // The guard aborts non-GET requests (e.g. Cloudflare's POST /cdn-cgi/rum beacon); Chromium then
        // logs ERR_BLOCKED_BY_CLIENT. That is our own doing, not a site error: count it separately.
        if (type === 'error' && /ERR_BLOCKED_BY_CLIENT/.test(msg.text()) && blockedMethods.length > 0) {
          guardInducedErrors++;
          return;
        }
        if (type === 'error') {
          errorCount++;
          push(consoleErrors, entry);
        } else {
          warningCount++;
          push(consoleWarnings, entry);
        }
      });
      page.on('pageerror', (error) => {
        push(pageErrors, {
          name: error.name,
          message: redactText(error.message),
          stack: redactText((error.stack ?? '').split('\n').slice(0, 6).join('\n'), 900)
        });
      });
      page.on('requestfailed', (request) => {
        if (blocked.has(request)) return;
        push(failedRequests, {
          method: request.method(),
          url: sanitizeUrl(request.url()),
          resourceType: request.resourceType(),
          failure: redactText(request.failure()?.errorText ?? 'unknown', 200)
        });
      });
      page.on('response', (response) => {
        const request = response.request();
        const status = response.status();
        if (request.isNavigationRequest() && response.frame() === page.mainFrame()) {
          const location = response.headers()['location'];
          push(navigations, { status, url: sanitizeUrl(response.url()), redirectTo: location ? sanitizeUrl(location) : undefined });
        }
        const contentType = response.headers()['content-type'];
        const kind = classify(contentType, request.headers()['rsc'] === '1');
        const url = sanitizeUrl(response.url());
        const firstParty = url.startsWith(baseOrigin);
        const resourceType = request.resourceType();
        const isStatic = resourceType === 'script' || resourceType === 'stylesheet' || resourceType === 'image' || resourceType === 'font';
        if (firstParty && (!isStatic || status >= 400 || kind === 'html') && requestLog.length < MAX_REQUESTS) {
          requestLog.push({ method: request.method(), url, status, resourceType, kind, contentType: contentType?.split(';')[0] });
        }
        if (status >= 400) {
          push(httpErrors, { status, method: request.method(), url: sanitizeUrl(response.url()), resourceType: request.resourceType() });
        }
      });

      const isFirstParty = (url: unknown): boolean => typeof url === 'string' && url.startsWith(baseOrigin);

      const criticalFindings = (): string[] => {
        const findings: string[] = [];
        for (const i of inspections) {
          for (const marker of (i.exceptionMarkers as string[]) ?? []) findings.push(`application exception marker "${marker}" on ${i.label} (${i.finalUrl})`);
        }
        for (const e of pageErrors) findings.push(`uncaught page error: ${e.name}: ${e.message}`);
        for (const n of navigations) {
          if (typeof n.status === 'number' && n.status >= 500) findings.push(`main document ${n.status}: ${n.url}`);
        }
        for (const r of failedRequests) {
          if ((r.resourceType === 'script' || r.resourceType === 'stylesheet') && isFirstParty(r.url)) findings.push(`first-party ${r.resourceType} request failed: ${r.url} (${r.failure})`);
        }
        for (const r of requestLog) {
          if ((r.resourceType === 'script' || r.resourceType === 'stylesheet') && r.kind === 'html') findings.push(`first-party ${r.resourceType} served as HTML (missing/stale asset?): ${r.url} (${r.status})`);
        }
        for (const r of httpErrors) {
          if ((r.resourceType === 'script' || r.resourceType === 'stylesheet') && isFirstParty(r.url)) findings.push(`first-party ${r.resourceType} returned ${r.status}: ${r.url}`);
        }
        return findings;
      };

      const report: Record<string, unknown> = {};
      const diag: Diagnostics = {
        report,
        criticalFindings,
        async inspect(label: string, opts?: { sampleText?: boolean }) {
          inspections.push(await inspectPage(page, label, opts?.sampleText ?? true));
        },
        permitOne(label: string, pathname: string, kind: WritePermit['kind'] = 'server-action') {
          const mine: WritePermit = { label, pathname, kind, used: false };
          permit = mine;
          return () => {
            if (permit === mine) permit = null;
          };
        }
      };

      await use(diag);

      // ---- teardown: assemble, persist and attach the report -------------------------------
      Object.assign(report, {
        test: testInfo.titlePath.slice(1).join(' > '),
        project: testInfo.project.name,
        target: baseOrigin,
        status: testInfo.status,
        finishedAt: new Date().toISOString(),
        criticalFindings: criticalFindings(),
        inspections,
        navigations,
        pageErrors,
        console: { errorCount, warningCount, guardInducedErrors, errors: consoleErrors, warnings: consoleWarnings.slice(0, 10) },
        failedRequests,
        httpErrors,
        blockedNonReadOnlyRequests: blockedMethods,
        permittedWrites,
        requests: requestLog
      });
      const slug = [testInfo.project.name, ...testInfo.titlePath.slice(1)].join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
      const dir = path.join(REPORT_ROOT, process.env.E2E_SUITE ?? testInfo.project.name);
      mkdirSync(dir, { recursive: true });
      const json = JSON.stringify(report, null, 2);
      writeFileSync(path.join(dir, `${slug}.json`), json);
      await testInfo.attach('diagnostics.json', { body: json, contentType: 'application/json' });
      await testInfo.attach('diagnostics.md', { body: renderMarkdown(report), contentType: 'text/markdown' });
      console.log(
        `[diagnostics] ${report.test}: ${(report.criticalFindings as string[]).length} critical, ${errorCount} console errors, ${failedRequests.length} failed requests, ${httpErrors.length} http>=400, ${pageErrors.length} page errors`
      );
    },
    { auto: true }
  ]
});

export { expect };

async function inspectPage(page: Page, label: string, sampleText: boolean): Promise<Record<string, unknown>> {
  const markers: string[] = [];
  let text = '';
  try {
    text = await page.locator('body').innerText({ timeout: 3000 });
  } catch {
    markers.push('body-text-unreadable');
  }
  for (const [name, re] of EXCEPTION_MARKERS) if (re.test(text)) markers.push(name);
  const nextErrorRoot = await page.locator('html#__next_error__').count().catch(() => 0);
  if (nextErrorRoot > 0) markers.push('next-error-root-element');
  return {
    label,
    finalUrl: sanitizeUrl(page.url()),
    title: redactText(await page.title().catch(() => ''), 200),
    exceptionMarkers: markers,
    // Authenticated pages can contain personal data: callers pass sampleText=false there.
    visibleTextSample: sampleText ? redactText(text.replace(/\s+/g, ' ').trim(), 300) : '[omitted]'
  };
}

function renderMarkdown(r: Record<string, unknown>): string {
  const list = (items: unknown[], f: (x: Record<string, unknown>) => string) =>
    items.length ? items.map((x) => `- ${f(x as Record<string, unknown>)}`).join('\n') : '- none';
  const c = r.console as { errorCount: number; warningCount: number; errors: Record<string, unknown>[] };
  return [
    `# ${r.test}`,
    `Target: ${r.target} | project: ${r.project} | status: ${r.status}`,
    '',
    '## Critical findings',
    list(r.criticalFindings as unknown[], (x) => String(x)),
    '',
    '## Page inspections',
    list(r.inspections as unknown[], (x) => `${x.label}: ${x.finalUrl} markers=[${(x.exceptionMarkers as string[]).join(', ')}] title="${x.title}" text="${x.visibleTextSample}"`),
    '',
    '## Main-frame navigations',
    list(r.navigations as unknown[], (x) => `${x.status} ${x.url}${x.redirectTo ? ` -> ${x.redirectTo}` : ''}`),
    '',
    '## Uncaught page errors',
    list(r.pageErrors as unknown[], (x) => `${x.name}: ${x.message}`),
    '',
    `## Console (${c.errorCount} errors, ${c.warningCount} warnings; errors shown; ${(c as { guardInducedErrors?: number }).guardInducedErrors ?? 0} excluded as caused by the read-only guard)`,
    list(c.errors, (x) => `${x.text}${x.source ? ` [${x.source}]` : ''}`),
    '',
    '## Failed requests',
    list(r.failedRequests as unknown[], (x) => `${x.method} ${x.resourceType} ${x.url} (${x.failure})`),
    '',
    '## HTTP >= 400 responses',
    list(r.httpErrors as unknown[], (x) => `${x.status} ${x.method} ${x.resourceType} ${x.url}`),
    '',
    '## Non-read-only requests blocked by the guard',
    list(r.blockedNonReadOnlyRequests as unknown[], (x) => `${x.method} ${x.url}`),
    '',
    '## Explicitly permitted writes (single-use, exact path)',
    list(r.permittedWrites as unknown[], (x) => `${x.label}: ${x.method} ${x.url}`),
    '',
    '## First-party requests (documents, fetch/RSC, anomalies; static assets omitted when healthy)',
    list(r.requests as unknown[], (x) => `${x.status} ${x.method} ${x.resourceType} ${x.kind} ${x.url}`)
  ].join('\n');
}
