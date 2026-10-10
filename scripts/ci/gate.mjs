#!/usr/bin/env node
/**
 * CI gate (CI/CD Phase 2): the single required status check.
 *
 * Path-aware CI skips jobs on purpose, so "all jobs green" is not enough: a job that SHOULD have
 * run but was skipped (because something upstream failed or was cancelled) must fail the gate, while
 * a job that was legitimately skipped (not needed for this change) must not.
 *
 * Input (env):
 *   NEEDS                 JSON of the workflow `needs` context (toJSON(needs))
 *   INTEGRATION_ALLOWED   "true" when this run may use the test-DB secrets (push, or same-repo PR)
 * Exit: 0 gate passes, 1 gate fails (problems printed). Dependency-free.
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const parseOut = (v, fallback) => {
  try {
    return v === undefined || v === '' ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
};

/**
 * @param {Record<string, {result: string, outputs?: Record<string,string>}>} needs
 * @param {{integrationAllowed: boolean}} ctx
 * @returns {{ok: boolean, problems: string[]}}
 */
export function evaluateGate(needs, ctx) {
  const problems = [];
  const detect = needs.detect;
  if (!detect || detect.result !== 'success') {
    return { ok: false, problems: [`detect did not succeed (${detect?.result ?? 'missing'}); nothing can be trusted`] };
  }
  const o = detect.outputs ?? {};
  const result = parseOut(o.result, null);
  const required = {
    check: parseOut(o.any_ci, true) === true,
    build: (parseOut(o.build_apps, ['?']) ?? ['?']).length > 0,
    integration: parseOut(o.run_integration, true) === true && ctx.integrationAllowed,
    'workflow-lint': result ? result.ciInfra === true : true
  };
  if (!result || o.any_ci === undefined || o.build_apps === undefined || o.run_integration === undefined) {
    problems.push('detect outputs are missing or unreadable (fail closed)');
  }
  for (const [name, mustRun] of Object.entries(required)) {
    const r = needs[name]?.result;
    if (r === undefined) {
      if (mustRun) problems.push(`${name}: required but not part of this run`);
    } else if (mustRun && r !== 'success') {
      problems.push(`${name}: required for this change but result was "${r}"`);
    } else if (!mustRun && r !== 'success' && r !== 'skipped') {
      problems.push(`${name}: result was "${r}"`);
    }
  }
  // Any job listed in `needs` that this gate does not know by name (e.g. one added to the workflow
  // later) must still not be able to fail or be cancelled without failing the gate.
  for (const [name, n] of Object.entries(needs)) {
    if (name === 'detect' || name in required) continue;
    if (n?.result !== 'success' && n?.result !== 'skipped') problems.push(`${name}: result was "${n?.result}"`);
  }
  return { ok: problems.length === 0, problems };
}

function main() {
  let needs;
  try {
    needs = JSON.parse(process.env.NEEDS ?? '');
  } catch {
    process.stderr.write('gate: NEEDS is not valid JSON (fail closed)\n');
    process.exit(1);
  }
  const { ok, problems } = evaluateGate(needs, { integrationAllowed: process.env.INTEGRATION_ALLOWED === 'true' });
  for (const [name, n] of Object.entries(needs)) process.stdout.write(`${name}: ${n.result}\n`);
  if (!ok) {
    for (const p of problems) process.stderr.write(`::error::${p}\n`);
    process.exit(1);
  }
  process.stdout.write('CI gate passed\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
