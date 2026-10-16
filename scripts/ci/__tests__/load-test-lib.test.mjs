// Unit tests for the pure modules of the k6 suite (tests/load/lib). k6 itself is not needed.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUCTION_ACK, SCENARIOS, checkRunShape, isProductionHost, parseBaseUrl, peakVus, resolveConfig } from '../../../tests/load/lib/config.js';
import { PROFILES, STAGE_ORDER, buildProfile, nextStage } from '../../../tests/load/lib/profiles.js';
import { thresholdsFor } from '../../../tests/load/lib/thresholds.js';
import { extractPaths, extractUuids, isHealthyStudentPage, isNotFoundPage, parseActionResult } from '../../../tests/load/lib/html.js';
import { summaryMarkdown } from '../../../tests/load/lib/summary-format.js';
import { actionsFromManifest } from '../../../tests/load/scripts/extract-action-ids.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const run = (scenario, profile = 'smoke', maxVus = 3) => ({ scenario, profile, maxVus });

describe('load config: target safety', () => {
  test('production hosts are recognised, including the apex and every portal', () => {
    for (const h of ['rms-careers.com', 'www.rms-careers.com', 'student.rms-careers.com', 'ADMIN.rms-careers.com', 'tutor.rms-careers.com.']) {
      assert.equal(isProductionHost(h), true, h);
    }
    for (const h of ['localhost', '127.0.0.1', 'rms-careers.com.example', 'staging-rms-careers.com']) assert.equal(isProductionHost(h), false, h);
  });

  test('production Workers on workers.dev (and their version previews) count as production', () => {
    for (const h of ['rms-student.acme.workers.dev', 'rms-web.acme.workers.dev', 'rms-admin.acme.workers.dev', '1a2b3c4d-rms-student.acme.workers.dev']) {
      assert.equal(isProductionHost(h), true, h);
    }
    for (const h of ['rms-student-staging.acme.workers.dev', 'staging-rms.acme.workers.dev', 'rms-studentx.acme.workers.dev']) {
      assert.equal(isProductionHost(h), false, h);
    }
    const env = { STUDENT_BASE_URL: 'https://rms-student.acme.workers.dev' };
    assert.throws(() => resolveConfig(env, run('student-browse', 'target', 1000)), /Refusing a production target/);
  });

  test('runtime shape check refuses CLI-overridden scenarios and VU counts above the configured peak', () => {
    const ours = { 'public-web': { executor: 'ramping-vus', stages: [{ target: 3 }, { target: 3 }, { target: 0 }] } };
    assert.equal(peakVus(ours), 3);
    assert.equal(peakVus({ x: { executor: 'per-vu-iterations', vus: 80 } }), 80);
    assert.equal(peakVus({ x: { executor: 'ramping-arrival-rate', preAllocatedVUs: 10, maxVUs: 200 } }), 200);
    assert.equal(checkRunShape(ours, { scenario: 'public-web', maxVus: 3, production: true }), null);
    // k6 run --vus 500 --duration 10m replaces the scenarios with a single "default" scenario.
    assert.match(checkRunShape({ default: { executor: 'constant-vus', vus: 500 } }, { scenario: 'public-web', maxVus: 3, production: false }), /overridden/);
    assert.match(checkRunShape({ 'public-web': { executor: 'constant-vus', vus: 9 } }, { scenario: 'public-web', maxVus: 3, production: false }), /above the 3/);
    assert.match(checkRunShape({ 'public-web': { vus: 6 } }, { scenario: 'public-web', maxVus: 6, production: true }), /at most 5/);
  });

  test('base URLs: https or loopback http only, no credentials, no path', () => {
    assert.equal(parseBaseUrl('X', 'http://127.0.0.1:8791').origin, 'http://127.0.0.1:8791');
    assert.equal(parseBaseUrl('X', 'https://staging.example.org/').origin, 'https://staging.example.org');
    assert.throws(() => parseBaseUrl('X', 'http://staging.example.org'), /plain http/);
    assert.throws(() => parseBaseUrl('X', 'https://user:pw@staging.example.org'), /credentials/);
    assert.throws(() => parseBaseUrl('X', 'https://staging.example.org/app'), /no path/);
    assert.throws(() => parseBaseUrl('X', 'ftp://x'), /absolute http/);
    assert.throws(() => parseBaseUrl('X', ''), /absolute http/);
  });

  test('production is refused for every scenario without the exact acknowledgement', () => {
    for (const scenario of Object.keys(SCENARIOS)) {
      const env = { WEB_BASE_URL: 'https://www.rms-careers.com', STUDENT_BASE_URL: 'https://student.rms-careers.com', ADMIN_BASE_URL: 'https://admin.rms-careers.com', LOAD_ALLOW_WRITES: '1' };
      assert.throws(() => resolveConfig(env, run(scenario)), /Refusing a production target/, scenario);
    }
  });

  test('with the acknowledgement only the public smoke at <= 5 VUs is allowed', () => {
    const env = { WEB_BASE_URL: 'https://www.rms-careers.com', STUDENT_BASE_URL: 'https://student.rms-careers.com', ADMIN_BASE_URL: 'https://admin.rms-careers.com', LOAD_ALLOW_PRODUCTION: PRODUCTION_ACK, LOAD_ALLOW_WRITES: '1' };
    assert.equal(resolveConfig(env, run('public-web', 'smoke', 5)).production, true);
    assert.throws(() => resolveConfig(env, run('public-web', 'smoke', 6)), /exceeds/);
    assert.throws(() => resolveConfig(env, run('public-web', 'baseline', 3)), /not "smoke"/);
    for (const s of Object.keys(SCENARIOS).filter((x) => x !== 'public-web')) {
      assert.throws(() => resolveConfig(env, run(s)), /not production-safe/, s);
    }
    assert.throws(() => resolveConfig({ ...env, LOAD_ALLOW_PRODUCTION: 'yes' }, run('public-web')), /LOAD_ALLOW_PRODUCTION/);
  });

  test('write scenarios need LOAD_ALLOW_WRITES=1; reads do not', () => {
    const env = { STUDENT_BASE_URL: 'http://127.0.0.1:8791' };
    assert.throws(() => resolveConfig(env, run('practice-quiz')), /LOAD_ALLOW_WRITES/);
    assert.throws(() => resolveConfig(env, run('formal-assessment')), /LOAD_ALLOW_WRITES/);
    assert.equal(resolveConfig({ ...env, LOAD_ALLOW_WRITES: '1' }, run('practice-quiz')).writes, true);
    assert.equal(resolveConfig(env, run('student-browse')).writes, false);
  });

  test('every scenario named in the catalogue has a script and thresholds', () => {
    const scripts = readdirSync(path.join(root, 'tests/load/scenarios')).map((f) => f.replace(/\.js$/, ''));
    for (const s of Object.keys(SCENARIOS)) {
      assert.ok(scripts.includes(s), `missing tests/load/scenarios/${s}.js`);
      assert.ok(Object.keys(thresholdsFor(s)).length > 2, `no scenario thresholds for ${s}`);
    }
  });
});

describe('load profiles', () => {
  test('every profile ramps up and back down to zero', () => {
    for (const name of Object.keys(PROFILES)) {
      const p = buildProfile(name, {});
      assert.ok(p.stages[0].target > 0 && p.stages[0].duration !== '0s', name);
      assert.equal(p.stages.at(-1).target, 0, name);
      assert.equal(Math.max(...p.stages.map((s) => s.target)), p.vus, name);
    }
  });

  test('staged order climbs to 1,000 and stops there', () => {
    assert.deepEqual(STAGE_ORDER.map((s) => PROFILES[s].vus), [3, 50, 250, 500, 1000]);
    assert.equal(nextStage('smoke'), 'baseline');
    assert.equal(nextStage('target'), null);
    assert.equal(nextStage('spike'), null);
  });

  test('overrides are validated', () => {
    assert.equal(buildProfile('baseline', { LOAD_VUS: '20', LOAD_HOLD: '90s' }).vus, 20);
    assert.throws(() => buildProfile('baseline', { LOAD_VUS: '0' }));
    assert.throws(() => buildProfile('baseline', { LOAD_HOLD: 'five minutes' }));
    assert.throws(() => buildProfile('huge', {}));
  });

  test('thresholds include an abort-on-fail guard against runaway error rates', () => {
    const t = thresholdsFor('student-browse');
    assert.ok(t.http_req_failed.some((x) => x.abortOnFail === true));
  });
});

describe('response checks', () => {
  const shell = (name, inner = '') => `<html><body><aside><p>${name}</p></aside><main>${inner}</main></body></html>`;

  test('a healthy page must show THIS student and nothing alarming', () => {
    assert.equal(isHealthyStudentPage(shell('Load Student 0001'), 'Load Student 0001'), true);
    assert.equal(isHealthyStudentPage(shell('Load Student 0002'), 'Load Student 0001'), false);
    assert.equal(isHealthyStudentPage(shell('Load Student 0001', '<h1>Resource Not Found</h1>'), 'Load Student 0001'), false);
    assert.equal(isHealthyStudentPage(shell('Load Student 0001', '<h2>Unable to load dashboard</h2>'), 'Load Student 0001'), false);
    assert.equal(isHealthyStudentPage('<form><input type="password"></form>', 'Load Student 0001'), false);
    assert.equal(isHealthyStudentPage(shell('Load Student 0001', 'NEXT_REDIRECT;replace;/login'), 'Load Student 0001'), false);
    assert.equal(isNotFoundPage('<span>404 · Page Not Found</span>'), true);
  });

  test('markers inside the inline Flight payload do not count (every page embeds its not-found boundary)', () => {
    const flight = '<script>self.__next_f.push([1,"Resource Not Found ... type=\\"password\\""])</script>';
    const page = shell('Load Student 0001', `<h1>Overview</h1>${flight}`);
    assert.equal(isNotFoundPage(page), false);
    assert.equal(isHealthyStudentPage(page, 'Load Student 0001'), true);
    assert.equal(isHealthyStudentPage(shell('x', '<script>"Load Student 0001"</script>'), 'Load Student 0001'), false);
    assert.equal(isHealthyStudentPage(shell('Load Student 0001', '<meta id="__next-page-redirect" http-equiv="refresh">'), 'Load Student 0001'), false);
  });

  test('a streamed notFound() (404 UI only in Flight data, with its digest) counts as not found', () => {
    // Shape measured on next 15.5 for a foreign batch: HTTP 200, no visible 404 text, digest in the Flight payload.
    const streamed = shell('Load Student 0001', '<div hidden id="S:0"></div><script>self.__next_f.push([1,"{\\"digest\\":\\"NEXT_HTTP_ERROR_FALLBACK;404\\"}"])</script>');
    assert.equal(isNotFoundPage(streamed), true);
    assert.equal(isHealthyStudentPage(streamed, 'Load Student 0001'), false);
  });

  test('link extraction is bounded and same-site', () => {
    const body = '<a href="/programs/CRP-2026">x</a><a href="/programs/CRP-2026">x</a><a href="https://evil.example/programs/x">x</a><a href="/content/0f8fad5b-d9cb-469f-a165-70867728950e?batchId=1">';
    assert.deepEqual(extractPaths(body, 'programs'), ['CRP-2026']);
    assert.deepEqual(extractUuids(body, 'content'), ['0f8fad5b-d9cb-469f-a165-70867728950e']);
    assert.equal(extractPaths('<a href="/programs/a"><a href="/programs/b">', 'programs', 1).length, 1);
  });

  test('Server Action results are read from the Flight rows', () => {
    const body = '0:{"a":"$@1","f":"","b":"build"}\n1:{"success":true,"data":{"attemptId":"x"}}\n';
    assert.deepEqual(parseActionResult(body), { success: true, data: { attemptId: 'x' } });
    assert.deepEqual(parseActionResult('0:{"a":{"success":false,"code":"UNAUTHORIZED"}}'), { success: false, code: 'UNAUTHORIZED' });
    assert.equal(parseActionResult('<html>404</html>'), null);
  });
});

describe('summary and action-id extraction', () => {
  test('summary renders headline numbers, per-route rows and only real thresholds', () => {
    const data = {
      state: { testRunDurationMs: 60000 },
      metrics: {
        http_reqs: { values: { count: 120, rate: 2 } },
        http_req_failed: { values: { rate: 0.005 }, thresholds: { 'rate<0.01': { ok: true } } },
        http_req_duration: { values: { med: 100, 'p(90)': 200, 'p(95)': 300, 'p(99)': 900 } },
        'http_req_duration{name:/overview}': { values: { count: 60, med: 120, 'p(95)': 350 }, thresholds: { 'max>=0': { ok: true } } },
        'http_req_failed{name:/overview}': { values: { rate: 0 }, thresholds: { 'rate>=0': { ok: true } } },
        rms_login_success: { values: { rate: 1 }, thresholds: { 'rate>0.99': { ok: false } } }
      }
    };
    const md = summaryMarkdown(data, { scenario: 'student-browse', profile: 'smoke', runId: 'r1', target: 'http://127.0.0.1:8791' });
    assert.match(md, /120 \(2\.0 req\/s\)/);
    assert.match(md, /\| `\/overview` \| 60 \| 120 ms/);
    assert.match(md, /`rms_login_success` \| `rate>0\.99` \| \*\*FAIL\*\*/);
    assert.doesNotMatch(md, /max>=0|rate>=0/);
    assert.match(md, /not browser navigation time/);
  });

  test('action ids are read from the Next 15 manifest (moduleId query) and the newer exportedName field', () => {
    const actions = encodeURIComponent(JSON.stringify([['C:\\x\\quiz.ts', [{ id: 'abc123', exportedName: 'submitPracticeQuizAttempt' }, { id: 'zzz', exportedName: 'other' }]]]));
    const manifest = {
      node: {
        abc123: { workers: { 'app/(dashboard)/assessments/[id]/page': { moduleId: `(action-browser)/loader.js?actions=${actions}&__client_imported__=true!` } } },
        def456: { exportedName: 'startFormalAssessmentAttempt', workers: {} }
      },
      edge: {}
    };
    const found = actionsFromManifest(manifest);
    assert.deepEqual([...found.get('submitPracticeQuizAttempt')], ['abc123']);
    assert.deepEqual([...found.get('startFormalAssessmentAttempt')], ['def456']);
    assert.equal(found.has('other'), false, 'an id is only attributed to the entry it belongs to');
  });
});

describe('repository hygiene for the load suite', () => {
  test('fixtures, results and local env files are git-ignored; nothing committed holds a secret', () => {
    const gi = readFileSync(path.join(root, '.gitignore'), 'utf8');
    assert.match(gi, /^tests\/load\/fixtures\/$/m);
    assert.match(gi, /^tests\/load\/results\/$/m);
    const example = readFileSync(path.join(root, 'tests/load/.env.example'), 'utf8');
    for (const line of example.split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l))) {
      const value = line.split('=').slice(1).join('=');
      assert.ok(/^(<[^>]+>|https?:\/\/127\.0\.0\.1:\d+)$/.test(value), `placeholder expected: ${line}`);
    }
  });

  test('scripts never log cookies, passwords or bodies', () => {
    const dir = path.join(root, 'tests/load');
    const files = ['lib/session.js', 'lib/fixtures.js', ...readdirSync(path.join(dir, 'scenarios')).map((f) => `scenarios/${f}`)];
    for (const f of files) {
      const code = readFileSync(path.join(dir, f), 'utf8');
      assert.doesNotMatch(code, /console\.(log|info|warn|error)\([^)]*(password|cookie|\.body|csrf|token)/i, f);
    }
  });
});
