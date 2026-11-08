// One-off ops tool: move the production database from Neon us-east-2 (Ohio) to ap-southeast-1 (Singapore).
// Runbook: docs/runbooks/prod-db-singapore-move-2026-11.md. Rehearsed 2026-11-08 (dump 43 s, restore 22 s,
// 35 tables/sequences and the full structure identical).
//
// Usage, from the repo root, with PostgreSQL 18 client tools installed:
//   node packages/db/scripts/move-prod-db.cjs dump      READ-ONLY on old prod: pg_dump to a temp file.
//   node packages/db/scripts/move-prod-db.cjs restore   writes ONLY to the new project; refuses unless it is empty.
//   node packages/db/scripts/move-prod-db.cjs verify    READ-ONLY on both: exact row count per table, every sequence value,
//                                              and a structure fingerprint (indexes, constraints, enums), old vs new.
//   node packages/db/scripts/move-prod-db.cjs cleanup   deletes the temp dump (it holds student data).
//   node packages/db/scripts/move-prod-db.cjs empty --new-is-not-live
//                                              drops everything in the NEW project. Rehearsals only: never after
//                                              the Workers point at it (then it IS production).
//
// Safety: every step checks the live `neon.endpoint_id` against the pins below before touching anything, so a
// mixed-up URL can never write to the old production database. URLs come from the git-ignored .env.prod-sg.local
// (OLD_PROD_DIRECT_URL, NEW_PROD_DIRECT_URL) and reach pg_dump/pg_restore through PG* environment variables, never
// argv; nothing prints them.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const BIN = process.env.PG_BIN || 'C:/Program Files/PostgreSQL/18/bin';
const OLD_EP = 'ep-blue-queen-b4qdn2dc'; // project lingering-fire-08003820, us-east-2
const NEW_EP = 'ep-spring-hat-aoyvl9wr'; // project RMS-Careers-Prod-SG, ap-southeast-1
const DUMP = path.join(os.tmpdir(), 'rms-prod-db-move', 'rms-prod.dump');
const exe = (name) => path.join(BIN, process.platform === 'win32' ? `${name}.exe` : name);

const env = Object.fromEntries(
  fs.readFileSync('.env.prod-sg.local', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')])
);
const { neon } = require(require.resolve('@neondatabase/serverless', { paths: ['packages/db'] }));
const redact = (s) => String(s).replace(/postgres(ql)?:\/\/\S+/g, '<url>');

function pgEnv(url, expectEp) {
  const u = new URL(url);
  const ep = u.hostname.split('.')[0];
  if (ep !== expectEp) throw new Error(`endpoint ${ep} is not the pinned ${expectEp}; refusing`);
  return { ...process.env, PGHOST: u.hostname, PGPORT: u.port || '5432', PGUSER: decodeURIComponent(u.username),
    PGPASSWORD: decodeURIComponent(u.password), PGDATABASE: u.pathname.slice(1), PGSSLMODE: 'require' };
}

function run(bin, args, url, ep) {
  const t = Date.now();
  const r = spawnSync(exe(bin), args, { env: pgEnv(url, ep), encoding: 'utf8' });
  if (r.error) throw new Error(`could not start ${bin} (${r.error.code}); install PostgreSQL 18 client tools or set PG_BIN`);
  const out = redact((r.stdout || '') + (r.stderr || '')).trim();
  if (out) console.log(out.split('\n').slice(-15).join('\n'));
  console.log(`[${bin}] exit ${r.status} in ${((Date.now() - t) / 1000).toFixed(1)} s`);
  if (r.status !== 0) process.exit(1);
}

async function identity(url, ep) {
  if (!url) throw new Error('connection string missing in .env.prod-sg.local');
  pgEnv(url, ep);
  const sql = neon(url);
  const [r] = await sql`select current_setting('neon.endpoint_id', true) ep`;
  if (r.ep !== ep) throw new Error(`live endpoint ${r.ep} is not ${ep}; refusing`);
  return sql;
}

async function snapshot(sql) {
  const tables = await sql`select table_schema s, table_name t from information_schema.tables
    where table_type='BASE TABLE' and table_schema not in ('pg_catalog','information_schema') and table_schema not like 'pg_%'
    order by 1,2`;
  const out = {};
  for (const { s, t } of tables) {
    const [{ n }] = await sql(`select count(*)::bigint n from "${s}"."${t}"`);
    out[`${s}.${t}`] = Number(n);
  }
  const seqs = await sql`select schemaname s, sequencename q, last_value v from pg_sequences
    where schemaname not in ('pg_catalog','information_schema') order by 1,2`;
  for (const { s, q, v } of seqs) out[`seq ${s}.${q}`] = v === null ? null : Number(v);
  const [st] = await sql`select
    (select count(*) from pg_indexes where schemaname not in ('pg_catalog','information_schema'))::int idx,
    (select count(*) from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname not like 'pg_%' and n.nspname <> 'information_schema')::int cons,
    (select count(*) from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typtype='e')::int enums,
    (select md5(string_agg(indexdef, '|' order by schemaname, indexname)) from pg_indexes where schemaname not in ('pg_catalog','information_schema')) idx_hash`;
  out['structure'] = JSON.stringify(st);
  return out;
}

const userSchemas = (sql) => sql`select nspname n from pg_namespace
  where nspname not in ('pg_catalog','information_schema','pg_toast') and nspname not like 'pg_%' and nspname <> 'public'`;

(async () => {
  const step = process.argv[2];
  if (step === 'dump') {
    await identity(env.OLD_PROD_DIRECT_URL, OLD_EP);
    fs.mkdirSync(path.dirname(DUMP), { recursive: true });
    run('pg_dump', ['--format=custom', '--no-owner', '--no-acl', '--verbose', `--file=${DUMP}`], env.OLD_PROD_DIRECT_URL, OLD_EP);
    console.log('dump size', (fs.statSync(DUMP).size / 1e6).toFixed(2), 'MB at', DUMP);
  } else if (step === 'restore') {
    const sql = await identity(env.NEW_PROD_DIRECT_URL, NEW_EP);
    const [{ n }] = await sql`select count(*)::int n from information_schema.tables where table_schema not in ('pg_catalog','information_schema')`;
    if (n > 0) throw new Error(`new project is not empty (${n} tables); refusing to restore over it`);
    if (!fs.existsSync(DUMP)) throw new Error('no dump file; run "dump" first');
    run('pg_restore', ['--no-owner', '--no-acl', '--exit-on-error', '--single-transaction', `--dbname=${new URL(env.NEW_PROD_DIRECT_URL).pathname.slice(1)}`, DUMP], env.NEW_PROD_DIRECT_URL, NEW_EP);
  } else if (step === 'verify') {
    const a = await snapshot(await identity(env.OLD_PROD_DIRECT_URL, OLD_EP));
    const b = await snapshot(await identity(env.NEW_PROD_DIRECT_URL, NEW_EP));
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    let diff = 0;
    for (const k of keys) { const ok = a[k] === b[k]; if (!ok) diff++; console.log(`${ok ? 'OK  ' : 'DIFF'} ${k.padEnd(55)} old=${a[k]} new=${b[k]}`); }
    console.log(diff === 0 ? `VERIFIED: ${keys.length} checks identical` : `MISMATCH: ${diff} differ`);
    if (diff) process.exit(1);
  } else if (step === 'cleanup') {
    fs.rmSync(path.dirname(DUMP), { recursive: true, force: true });
    console.log('dump deleted');
  } else if (step === 'empty') {
    if (!process.argv.includes('--new-is-not-live')) throw new Error('"empty" is for rehearsals only; pass --new-is-not-live to confirm no Worker uses the new project');
    const sql = await identity(env.NEW_PROD_DIRECT_URL, NEW_EP);
    for (const { n } of await userSchemas(sql)) { await sql(`drop schema "${n}" cascade`); console.log('dropped schema', n); }
    await sql`drop schema public cascade`;
    await sql`create schema public`;
    console.log('new project emptied');
  } else {
    console.error('usage: node packages/db/scripts/move-prod-db.cjs dump|restore|verify|cleanup|empty --new-is-not-live');
    process.exit(2);
  }
})().catch((e) => { console.error('ERROR', redact(e.message)); process.exit(1); });
