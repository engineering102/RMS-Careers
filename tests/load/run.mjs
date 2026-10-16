#!/usr/bin/env node
// Runner for the k6 suite: validates the target before k6 starts, wires fixture/result paths, samples the load
// generator's own CPU and memory, and climbs load stages ONLY while every previous stage passed.
//
//   node --env-file=tests/load/.env.load.local tests/load/run.mjs --scenario=student-browse --profile=baseline
//   node --env-file=... tests/load/run.mjs --scenario=student-browse --staged --to=peak
//   node tests/load/run.mjs --scenario=public-web --dry-run          (validate config and print the plan only)
//
// Exit code: k6's (0 pass, 99 thresholds failed, other = error), 3 if the generator saturated, 2 on bad usage.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LoadConfigError, resolveConfig } from './lib/config.js';
import { buildProfile, nextStage, PROFILES, STAGE_ORDER } from './lib/profiles.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const GENERATOR_CPU_LIMIT = 0.8;

function args(argv) {
  const get = (k) => argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  return {
    scenario: get('scenario'),
    profile: get('profile') ?? 'smoke',
    staged: argv.includes('--staged'),
    from: get('from') ?? 'smoke',
    to: get('to') ?? 'baseline',
    cooldownS: Number(get('cooldown') ?? 120),
    dryRun: argv.includes('--dry-run')
  };
}

function absolute(p) {
  return p ? path.resolve(p) : p;
}

/** CPU busy fraction across all cores between two os.cpus() snapshots. */
function cpuBusy(a, b) {
  let idle = 0;
  let total = 0;
  b.forEach((cpu, i) => {
    const prev = a[i].times;
    const cur = cpu.times;
    const t = Object.keys(cur).reduce((s, k) => s + (cur[k] - prev[k]), 0);
    idle += cur.idle - prev.idle;
    total += t;
  });
  return total > 0 ? 1 - idle / total : 0;
}

function runK6(scenario, profile, env) {
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${scenario}-${profile}`;
  const resultsDir = path.join(here, 'results');
  mkdirSync(resultsDir, { recursive: true });
  const childEnv = { ...env, LOAD_PROFILE: profile, LOAD_RUN_ID: runId, LOAD_RESULTS_DIR: resultsDir.replace(/\\/g, '/') };
  const script = path.join(here, 'scenarios', `${scenario}.js`);
  const k6 = env.K6_BIN || 'k6';

  console.log(`\n[load] ${runId}: k6 run ${path.relative(process.cwd(), script)} (profile ${profile})`);
  const samples = [];
  let last = os.cpus();
  const timer = setInterval(() => {
    const now = os.cpus();
    samples.push({ t: Date.now(), cpu: Number(cpuBusy(last, now).toFixed(3)), freeMemMb: Math.round(os.freemem() / 1e6), loadAvg1: os.loadavg()[0] });
    last = now;
  }, 5000);

  return new Promise((resolve) => {
    // Secrets travel in the child's environment only, never on the command line (visible in process lists).
    const child = spawn(k6, ['run', '--quiet', script], { env: childEnv, stdio: 'inherit' });
    child.on('error', (err) => {
      clearInterval(timer);
      console.error(`[load] could not start k6 (${err.code ?? err.message}). Install k6 (tests/load/README.md) or set K6_BIN.`);
      resolve({ code: 127, runId, saturated: false });
    });
    child.on('exit', (code) => {
      clearInterval(timer);
      const peak = samples.reduce((m, s) => Math.max(m, s.cpu), 0);
      const sustained = samples.filter((s) => s.cpu >= GENERATOR_CPU_LIMIT).length >= 3;
      const generator = { cores: os.cpus().length, totalMemMb: Math.round(os.totalmem() / 1e6), peakCpu: peak, saturated: sustained, samples };
      writeFileSync(path.join(resultsDir, `${runId}.generator.json`), `${JSON.stringify(generator, null, 2)}\n`);
      console.log(`[load] generator: peak CPU ${(peak * 100).toFixed(0)} % on ${generator.cores} cores, min free memory ${Math.min(...samples.map((s) => s.freeMemMb), Infinity)} MB`);
      if (sustained) console.warn(`[load] WARNING: the load generator was >= ${GENERATOR_CPU_LIMIT * 100}% CPU for 15 s or more. Latency numbers from this run are not trustworthy; use a bigger or distributed generator.`);
      resolve({ code: code ?? 1, runId, saturated: sustained });
    });
  });
}

async function main() {
  const a = args(process.argv.slice(2));
  if (!a.scenario) {
    console.error('usage: run.mjs --scenario=<name> [--profile=<name> | --staged --from=<stage> --to=<stage>] [--dry-run]');
    process.exit(2);
  }

  const env = { ...process.env };
  if (a.staged) {
    // Overrides would flatten every stage to the same shape; the staged climb uses the profiles as defined.
    for (const k of ['LOAD_VUS', 'LOAD_RAMP', 'LOAD_HOLD']) {
      if (env[k]) console.warn(`[load] ignoring ${k} in a staged run`);
      delete env[k];
    }
  }
  const defaultFixture = path.join(here, 'fixtures', 'students.local.json');
  env.LOAD_FIXTURE = absolute(env.LOAD_FIXTURE) ?? (existsSync(defaultFixture) ? defaultFixture : undefined);
  if (env.LOAD_ACTION_IDS) env.LOAD_ACTION_IDS = absolute(env.LOAD_ACTION_IDS);
  for (const k of ['LOAD_FIXTURE', 'LOAD_ACTION_IDS']) if (env[k]) env[k] = env[k].replace(/\\/g, '/');

  const plan = a.staged
    ? STAGE_ORDER.slice(STAGE_ORDER.indexOf(a.from), STAGE_ORDER.indexOf(a.to) + 1)
    : [a.profile];
  const badRange = a.staged && (!STAGE_ORDER.includes(a.from) || !STAGE_ORDER.includes(a.to));
  if (badRange || plan.length === 0 || plan.some((p) => !PROFILES[p])) {
    console.error(`Bad stage range or profile. Stages: ${STAGE_ORDER.join(' -> ')}; profiles: ${Object.keys(PROFILES).join(', ')}.`);
    process.exit(2);
  }

  // Validate every planned stage up front, so a refused target never sends a single request.
  try {
    for (const p of plan) {
      const prof = buildProfile(p, env);
      const cfg = resolveConfig(env, { scenario: a.scenario, profile: p, maxVus: a.scenario === 'admin-read' ? Math.min(prof.vus, 3) : prof.vus });
      if (cfg.production && a.staged) throw new LoadConfigError('Staged runs are never allowed against production.');
      console.log(`[load] plan: ${p.padEnd(12)} peak ${String(prof.vus).padStart(4)} VUs  stages ${prof.stages.map((s) => `${s.duration}->${s.target}`).join(', ')}`);
    }
  } catch (err) {
    console.error(`[load] refused: ${err.message}`);
    process.exit(2);
  }
  if (a.dryRun) return;

  for (const [i, p] of plan.entries()) {
    const r = await runK6(a.scenario, p, env);
    if (r.code !== 0 || r.saturated) {
      console.error(`[load] stage "${p}" ${r.saturated ? 'saturated the generator' : `failed (k6 exit ${r.code})`}. Stopping; later stages were NOT run.`);
      process.exit(r.code !== 0 ? r.code : 3);
    }
    console.log(`[load] stage "${p}" passed its thresholds.`);
    if (i < plan.length - 1) {
      console.log(`[load] cooling down ${a.cooldownS} s before "${plan[i + 1]}" (let autoscaling settle)...`);
      await new Promise((res) => setTimeout(res, a.cooldownS * 1000));
    }
  }
  const after = nextStage(plan[plan.length - 1]);
  if (a.staged && after) console.log(`[load] highest stage run: "${plan[plan.length - 1]}". Next would be "${after}" (rerun with --from=${after} --to=... when ready).`);
}

main();
