import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateGate } from '../gate.mjs';

const GATE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'gate.mjs');

const detectOut = ({ anyCi = true, buildApps = ['web'], runIntegration = false, ciInfra = false } = {}) => ({
  result: 'success',
  outputs: {
    any_ci: JSON.stringify(anyCi),
    build_apps: JSON.stringify(buildApps),
    run_integration: JSON.stringify(runIntegration),
    result: JSON.stringify({ ciInfra })
  }
});
const needs = (d, others = {}) => ({
  detect: d,
  check: { result: 'skipped' },
  integration: { result: 'skipped' },
  build: { result: 'skipped' },
  'workflow-lint': { result: 'skipped' },
  ...Object.fromEntries(Object.entries(others).map(([k, v]) => [k, { result: v }]))
});
const trusted = { integrationAllowed: true };

describe('evaluateGate', () => {
  test('docs-only: everything legitimately skipped -> pass', () => {
    const d = detectOut({ anyCi: false, buildApps: [] });
    assert.equal(evaluateGate(needs(d), trusted).ok, true);
  });

  test('web change: check + build succeeded, integration skipped -> pass', () => {
    const d = detectOut();
    assert.equal(evaluateGate(needs(d, { check: 'success', build: 'success' }), trusted).ok, true);
  });

  test('required job skipped (e.g. upstream failure) -> fail', () => {
    const d = detectOut();
    const g = evaluateGate(needs(d, { check: 'success', build: 'skipped' }), trusted);
    assert.equal(g.ok, false);
    assert.match(g.problems.join(), /build: required/);
  });

  test('failed / cancelled job -> fail even when it was not required', () => {
    const d = detectOut({ anyCi: false, buildApps: [] });
    assert.equal(evaluateGate(needs(d, { integration: 'failure' }), trusted).ok, false);
    assert.equal(evaluateGate(needs(d, { check: 'cancelled' }), trusted).ok, false);
  });

  test('detect failed or missing -> fail closed', () => {
    assert.equal(evaluateGate({ detect: { result: 'failure' } }, trusted).ok, false);
    assert.equal(evaluateGate({}, trusted).ok, false);
  });

  test('unreadable detect outputs -> fail closed', () => {
    const g = evaluateGate({ detect: { result: 'success', outputs: {} }, check: { result: 'success' } }, trusted);
    assert.equal(g.ok, false);
  });

  test('integration required on trusted runs, skip tolerated on fork PRs', () => {
    const d = detectOut({ runIntegration: true });
    const base = { check: 'success', build: 'success' };
    assert.equal(evaluateGate(needs(d, { ...base, integration: 'skipped' }), trusted).ok, false);
    assert.equal(evaluateGate(needs(d, { ...base, integration: 'success' }), trusted).ok, true);
    assert.equal(evaluateGate(needs(d, { ...base, integration: 'skipped' }), { integrationAllowed: false }).ok, true);
  });

  test('a job the gate does not know by name cannot fail or be cancelled silently', () => {
    const d = detectOut({ anyCi: false, buildApps: [] });
    const n = needs(d);
    assert.equal(evaluateGate({ ...n, deploy: { result: 'success' } }, trusted).ok, true);
    assert.equal(evaluateGate({ ...n, deploy: { result: 'skipped' } }, trusted).ok, true);
    assert.equal(evaluateGate({ ...n, deploy: { result: 'failure' } }, trusted).ok, false);
    assert.equal(evaluateGate({ ...n, deploy: { result: 'cancelled' } }, trusted).ok, false);
  });

  test('required integration that was cancelled (e.g. pending run superseded) cannot pass', () => {
    const d = detectOut({ runIntegration: true });
    const base = { check: 'success', build: 'success' };
    assert.equal(evaluateGate(needs(d, { ...base, integration: 'cancelled' }), trusted).ok, false);
    // the fork exception does not extend to a cancelled/failed integration job
    assert.equal(evaluateGate(needs(d, { ...base, integration: 'cancelled' }), { integrationAllowed: false }).ok, false);
  });

  test('workflow change requires workflow-lint', () => {
    const d = detectOut({ ciInfra: true, buildApps: ['admin', 'student', 'web'], runIntegration: true });
    const ok = { check: 'success', build: 'success', integration: 'success' };
    assert.equal(evaluateGate(needs(d, ok), trusted).ok, false);
    assert.equal(evaluateGate(needs(d, { ...ok, 'workflow-lint': 'success' }), trusted).ok, true);
  });
});

describe('gate CLI', () => {
  const run = (n, allowed = 'true') => {
    try {
      const out = execFileSync('node', [GATE], {
        env: { ...process.env, NEEDS: JSON.stringify(n), INTEGRATION_ALLOWED: allowed },
        encoding: 'utf8',
        stdio: 'pipe'
      });
      return { code: 0, out };
    } catch (e) {
      return { code: e.status, out: String(e.stdout) + String(e.stderr) };
    }
  };

  test('exit 0 on pass, 1 on fail, 1 on garbage input', () => {
    assert.equal(run(needs(detectOut({ anyCi: false, buildApps: [] }))).code, 0);
    assert.equal(run(needs(detectOut(), { check: 'failure' })).code, 1);
    assert.throws(() =>
      execFileSync('node', [GATE], { env: { ...process.env, NEEDS: 'nope' }, stdio: 'pipe' })
    );
  });
});
