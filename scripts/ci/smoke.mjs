#!/usr/bin/env node
/**
 * Phase 4 smoke tests: unauthenticated, read-only GET requests against one app.
 *
 * Used (a) against a local `wrangler dev --local` of the extracted artifact before any deploy (no credentials), and
 * (b) after a production deploy against the public URL. It never sends credentials, cookies or a body, and it does not
 * follow redirects, so a login redirect is asserted rather than silently followed.
 *
 *   node scripts/ci/smoke.mjs --app web --base-url http://127.0.0.1:8791
 *   node scripts/ci/smoke.mjs --app student --production
 *
 * Exit 0 only when every check of the app passes within the attempt budget. Expectations were observed on the live
 * sites: www serves /, /robots.txt, /sitemap.xml; admin and student serve /login and redirect / to /login.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const PRODUCTION_URLS = {
  web: 'https://www.rms-careers.com',
  admin: 'https://admin.rms-careers.com',
  student: 'https://student.rms-careers.com'
};

const html = /^text\/html\b/i;
const loginGate = [
  { path: '/login', status: 200, type: html },
  { path: '/', status: 307, redirectPathPrefix: '/login' }
];

export const CHECKS = {
  web: [
    { path: '/', status: 200, type: html },
    { path: '/robots.txt', status: 200, type: /^text\/plain\b/i },
    { path: '/sitemap.xml', status: 200, type: /xml/i }
  ],
  admin: loginGate,
  student: loginGate
};

const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Returns null when the response satisfies the check, otherwise a short reason. */
export function judge(check, response, base) {
  if (response.status !== check.status) return `expected status ${check.status}, got ${response.status}`;
  if (check.type) {
    const type = response.headers.get('content-type') ?? '';
    if (!check.type.test(type)) return `unexpected content-type "${type}"`;
  }
  if (check.redirectPathPrefix) {
    const location = response.headers.get('location');
    if (!location) return 'missing Location header';
    let target;
    try {
      target = new URL(location, base);
    } catch {
      return `unparsable Location "${location}"`;
    }
    if (!target.pathname.startsWith(check.redirectPathPrefix)) return `redirects to ${target.pathname}, expected ${check.redirectPathPrefix}*`;
  }
  return null;
}

export function assertBaseUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`invalid base URL "${raw}"`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('base URL must be http or https');
  if (url.username || url.password) throw new Error('base URL must not contain credentials');
  return url.origin;
}

/**
 * @param {{app: string, baseUrl: string, attempts?: number, delayMs?: number, timeoutMs?: number,
 *          fetchImpl?: typeof fetch, sleep?: (ms: number) => Promise<void>}} opts
 */
export async function runSmoke({ app, baseUrl, attempts = 10, delayMs = 6000, timeoutMs = 20000, fetchImpl = fetch, sleep = sleepMs }) {
  const checks = CHECKS[app];
  if (!checks) throw new Error(`unknown app "${app}" (web | admin | student)`);
  const base = assertBaseUrl(baseUrl);
  const results = [];
  for (const check of checks) {
    let reason = 'not attempted';
    let used = 0;
    for (let i = 1; i <= attempts; i++) {
      used = i;
      try {
        const response = await fetchImpl(base + check.path, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(timeoutMs), headers: { 'user-agent': 'rms-smoke/1', accept: '*/*' } });
        await response.arrayBuffer?.().catch(() => {}); // drain
        reason = judge(check, response, base);
      } catch (err) {
        reason = `request failed: ${err.cause?.code ?? err.name ?? 'error'}`;
      }
      if (reason === null) break;
      if (i < attempts) await sleep(delayMs);
    }
    results.push({ path: check.path, ok: reason === null, attempts: used, problem: reason });
  }
  return { app, baseUrl: base, ok: results.every((r) => r.ok), results };
}

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) throw new Error(`unexpected argument ${argv[i]}`);
    const key = argv[i].slice(2);
    opts[key] = argv[i + 1] === undefined || argv[i + 1].startsWith('--') ? 'true' : argv[++i];
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const app = opts.app;
  if (!CHECKS[app]) throw new Error(`--app must be one of ${Object.keys(CHECKS).join(', ')}`);
  if (!opts['base-url'] && opts.production !== 'true') throw new Error('give --base-url <url> or --production (never an implicit default)');
  const baseUrl = opts['base-url'] ?? PRODUCTION_URLS[app];
  const result = await runSmoke({ app, baseUrl, attempts: Number(opts.attempts ?? 10), delayMs: Number(opts['delay-ms'] ?? 6000) });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  for (const r of result.results.filter((x) => !x.ok)) process.stdout.write(`::error title=smoke-failed::${app} ${r.path}: ${r.problem}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((err) => {
    process.stderr.write(`::error::${err.message}\n`);
    process.exit(1);
  });
}
