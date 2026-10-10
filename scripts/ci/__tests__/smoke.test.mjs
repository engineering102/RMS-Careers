import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHECKS, PRODUCTION_URLS, assertBaseUrl, judge, runSmoke } from '../smoke.mjs';

const run = promisify(execFile);
const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'smoke.mjs');

/** A tiny fake site. `routes` maps path -> [status, headers, body]; `hits` counts requests per path. */
function fakeSite(routes) {
  const hits = {};
  const server = http.createServer((req, res) => {
    hits[req.url] = (hits[req.url] ?? 0) + 1;
    const entry = typeof routes[req.url] === 'function' ? routes[req.url](hits[req.url]) : routes[req.url];
    const [status, headers, body] = entry ?? [404, { 'content-type': 'text/plain' }, 'nope'];
    res.writeHead(status, headers);
    res.end(body ?? '');
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, hits, url: `http://127.0.0.1:${server.address().port}` })));
}

const HTML = { 'content-type': 'text/html; charset=utf-8' };
const goodWeb = { '/': [200, HTML, '<html>'], '/robots.txt': [200, { 'content-type': 'text/plain' }, 'User-agent: *'], '/sitemap.xml': [200, { 'content-type': 'application/xml' }, '<urlset/>'] };
const goodGate = { '/login': [200, HTML, '<html>'], '/': [307, { location: '/login?callbackUrl=https%3A%2F%2Fexample.test%2F' }, ''] };
const fast = { attempts: 3, delayMs: 1, sleep: async () => {} };

describe('smoke checks', () => {
  const sites = [];
  const open = async (routes) => {
    const s = await fakeSite(routes);
    sites.push(s.server);
    return s;
  };
  after(() => sites.forEach((s) => s.close()));

  test('web, admin and student pass against a healthy site', async () => {
    for (const [app, routes] of [['web', goodWeb], ['admin', goodGate], ['student', goodGate]]) {
      const s = await open(routes);
      const r = await runSmoke({ app, baseUrl: s.url, ...fast });
      assert.equal(r.ok, true, `${app}: ${JSON.stringify(r.results)}`);
      assert.equal(r.results.length, CHECKS[app].length);
    }
  });

  test('a login gate that stops redirecting (200 on /) fails', async () => {
    const s = await open({ ...goodGate, '/': [200, HTML, 'dashboard without login'] });
    const r = await runSmoke({ app: 'admin', baseUrl: s.url, ...fast });
    assert.equal(r.ok, false);
    assert.match(r.results.find((x) => x.path === '/').problem, /expected status 307, got 200/);
  });

  test('redirecting somewhere other than /login fails', async () => {
    const s = await open({ ...goodGate, '/': [307, { location: 'https://evil.example/phish' }, ''] });
    const r = await runSmoke({ app: 'student', baseUrl: s.url, ...fast });
    assert.equal(r.ok, false);
    assert.match(r.results.find((x) => x.path === '/').problem, /redirects to \/phish, expected \/login/);
  });

  test('a redirect without Location, a 500, a wrong content-type and a 404 each fail', async () => {
    const cases = [
      [{ ...goodGate, '/': [307, {}, ''] }, 'admin', /missing Location/],
      [{ ...goodGate, '/login': [500, HTML, 'boom'] }, 'admin', /expected status 200, got 500/],
      [{ ...goodWeb, '/': [200, { 'content-type': 'application/json' }, '{}'] }, 'web', /unexpected content-type/],
      [{ '/': goodWeb['/'], '/robots.txt': goodWeb['/robots.txt'] }, 'web', /got 404/]
    ];
    for (const [routes, app, pattern] of cases) {
      const s = await open(routes);
      const r = await runSmoke({ app, baseUrl: s.url, ...fast });
      assert.equal(r.ok, false);
      assert.ok(r.results.some((x) => pattern.test(x.problem ?? '')), `${app}: ${JSON.stringify(r.results)}`);
    }
  });

  test('transient failures are retried until the attempt budget is spent', async () => {
    const s = await open({ ...goodGate, '/login': (n) => (n < 3 ? [503, HTML, 'warming up'] : [200, HTML, 'ok']) });
    const ok = await runSmoke({ app: 'admin', baseUrl: s.url, attempts: 3, delayMs: 1, sleep: async () => {} });
    assert.equal(ok.ok, true);
    assert.equal(ok.results.find((x) => x.path === '/login').attempts, 3);
    const s2 = await open({ ...goodGate, '/login': [503, HTML, 'down'] });
    const bad = await runSmoke({ app: 'admin', baseUrl: s2.url, attempts: 2, delayMs: 1, sleep: async () => {} });
    assert.equal(bad.ok, false);
    assert.equal(bad.results.find((x) => x.path === '/login').attempts, 2);
  });

  test('an unreachable host fails with a short reason, not a crash', async () => {
    const r = await runSmoke({ app: 'web', baseUrl: 'http://127.0.0.1:1', timeoutMs: 500, ...fast });
    assert.equal(r.ok, false);
    assert.match(r.results[0].problem, /request failed/);
  });

  test('requests carry no credentials, no cookies and do not follow redirects', async () => {
    const seen = [];
    const fetchImpl = async (url, init) => {
      seen.push({ url, init });
      return new Response('', { status: url.endsWith('/') ? 307 : 200, headers: { 'content-type': 'text/html', location: '/login' } });
    };
    await runSmoke({ app: 'admin', baseUrl: 'https://admin.example.test', fetchImpl, ...fast });
    for (const { init } of seen) {
      assert.equal(init.method, 'GET');
      assert.equal(init.redirect, 'manual');
      assert.deepEqual(Object.keys(init.headers).sort(), ['accept', 'user-agent']);
      assert.equal(init.body, undefined);
    }
  });
});

describe('inputs', () => {
  test('production URLs are the canonical hyphenated domains', () => {
    assert.deepEqual(PRODUCTION_URLS, { web: 'https://www.rms-careers.com', admin: 'https://admin.rms-careers.com', student: 'https://student.rms-careers.com' });
    for (const u of Object.values(PRODUCTION_URLS)) assert.doesNotMatch(u, /rmscareers/);
  });

  test('base URL validation rejects non-http schemes and embedded credentials', () => {
    assert.equal(assertBaseUrl('https://a.example.test/path?q=1'), 'https://a.example.test');
    for (const bad of ['ftp://x', 'file:///etc/passwd', 'javascript:alert(1)', 'https://user:pw@x.test', 'not a url', '']) assert.throws(() => assertBaseUrl(bad), undefined, bad);
  });

  test('unknown apps are rejected', async () => {
    await assert.rejects(runSmoke({ app: 'tutor', baseUrl: 'http://127.0.0.1:1' }), /unknown app/);
  });

  test('judge: content type and redirect rules', () => {
    const res = (status, headers) => ({ status, headers: new Headers(headers) });
    assert.equal(judge({ status: 200, type: /^text\/html/ }, res(200, { 'content-type': 'text/html; charset=utf-8' }), 'http://x'), null);
    assert.match(judge({ status: 200, type: /^text\/html/ }, res(200, {}), 'http://x'), /content-type/);
    assert.equal(judge({ status: 307, redirectPathPrefix: '/login' }, res(307, { location: 'http://other-host/login?x=1' }), 'http://x'), null);
  });

  test('the CLI refuses an implicit target: --base-url or --production is required', () => {
    const r = spawnSync(process.execPath, [cli, '--app', 'web'], { encoding: 'utf8' });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /never an implicit default/);
    const bad = spawnSync(process.execPath, [cli, '--app', 'tutor', '--base-url', 'http://127.0.0.1:1'], { encoding: 'utf8' });
    assert.notEqual(bad.status, 0);
  });

  test('the CLI exits 1 with an annotation when a check fails', async () => {
    const s = await fakeSite({ '/': [500, HTML, 'x'] });
    try {
      // async spawn: the fake site lives in this process and must keep answering while the CLI runs
      const r = await run(process.execPath, [cli, '--app', 'web', '--base-url', s.url, '--attempts', '1', '--delay-ms', '1']).then(
        (ok) => ({ code: 0, ...ok }),
        (err) => ({ code: err.code, stdout: err.stdout, stderr: err.stderr })
      );
      assert.equal(r.code, 1);
      assert.match(r.stdout, /::error title=smoke-failed::web \/: expected status 200, got 500/);
    } finally {
      s.server.close();
    }
  });
});
