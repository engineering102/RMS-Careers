#!/usr/bin/env node
/**
 * Cloudflare/OpenNext build-environment guard (shared by apps/web, apps/student, apps/admin).
 *
 * WHY: `opennextjs-cloudflare build` reads `.env`, `.env.<mode>`, `.env.local` and
 * `.env.<mode>.local` (mode = production | development | test) from BOTH the app directory and
 * the monorepo root, and writes every value into `.open-next/cloudflare/next-env.mjs`, which is
 * bundled into the Worker. Local secrets (or a localhost NEXTAUTH_URL) would be baked into the
 * deployed artifact. Production values must come from Wrangler secrets / `wrangler.jsonc` vars;
 * local Worker preview uses `.dev.vars`, which OpenNext does NOT bundle.
 *
 * Usage (run with cwd = the app directory):
 *   node ../../scripts/check-cloudflare-build-env.mjs pre    # before the build: refuse populated env files
 *   node ../../scripts/check-cloudflare-build-env.mjs post   # after the build: refuse a non-empty next-env.mjs
 *
 * Only file names and variable NAMES are ever printed, never values.
 * `.env.example` / `.dev.vars.example` are not read by OpenNext and are always allowed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MODES = ['production', 'development', 'test'];
const ENV_FILE_NAMES = ['.env', ...MODES.map((m) => `.env.${m}`), '.env.local', ...MODES.map((m) => `.env.${m}.local`)];

/** Returns the names of variables with a non-empty value. Values are never returned. */
export function populatedVariableNames(content) {
  const names = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    const quote = value[0];
    if (quote === '"' || quote === "'" || quote === '`') {
      const end = value.indexOf(quote, 1);
      value = end === -1 ? value.slice(1) : value.slice(1, end);
    } else {
      value = value.replace(/\s+#.*$/, '').trim(); // unquoted inline comment
    }
    if (value !== '') names.push(match[1]);
  }
  return names;
}

export function findUnsafeEnvFiles(appDir, rootDir) {
  const dirs = rootDir === appDir ? [appDir] : [rootDir, appDir];
  const findings = [];
  for (const dir of dirs) {
    for (const name of ENV_FILE_NAMES) {
      const file = path.join(dir, name);
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
      const names = populatedVariableNames(fs.readFileSync(file, 'utf8'));
      if (names.length > 0) findings.push({ file: path.relative(rootDir, file) || name, names });
    }
  }
  return findings;
}

function fail(lines) {
  console.error(['', ...lines, ''].join('\n'));
  process.exit(1);
}

async function pre(appDir, rootDir) {
  const findings = findUnsafeEnvFiles(appDir, rootDir);
  if (findings.length === 0) {
    console.log(`[cf-env-guard] OK: no populated .env files that OpenNext would embed (${path.basename(appDir)}).`);
    return;
  }
  fail([
    '[cf-env-guard] BUILD BLOCKED: populated local env files would be embedded in the Cloudflare Worker.',
    '',
    'OpenNext copies these files into .open-next/cloudflare/next-env.mjs (bundled into the Worker):',
    ...findings.map((f) => `  - ${f.file}: ${f.names.join(', ')}`),
    '',
    'Fix (values are never printed here):',
    '  1. Move the file(s) out of the way for this build, e.g.  mv .env.local .env.local.bak',
    '     (OpenNext ignores .env.local.bak; it is gitignored; restore it afterwards for `next dev`).',
    '     Or build from a clean checkout / `git worktree`.',
    '  2. Production values come from `wrangler secret put <NAME>` and `vars` in wrangler.jsonc.',
    '  3. Local Worker preview reads secrets from .dev.vars (not bundled).',
    'Local development (`next dev`, `next build`, tests) is unaffected by this guard.'
  ]);
}

async function post(appDir) {
  const file = path.join(appDir, '.open-next', 'cloudflare', 'next-env.mjs');
  if (!fs.existsSync(file)) fail([`[cf-env-guard] BUILD ARTIFACT CHECK FAILED: ${path.relative(process.cwd(), file)} not found.`]);
  const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
  const leaked = MODES.flatMap((m) => Object.keys(mod[m] ?? {}).map((k) => `${m}:${k}`));
  if (leaked.length > 0) {
    fail([
      '[cf-env-guard] BUILD ARTIFACT CHECK FAILED: next-env.mjs embeds environment variables.',
      `  variables (names only): ${[...new Set(leaked.map((l) => l.split(':')[1]))].join(', ')}`,
      '  Delete .open-next, remove the populated .env* files, and rebuild. Do NOT deploy this artifact.'
    ]);
  }
  console.log('[cf-env-guard] OK: next-env.mjs contains no embedded environment variables.');
}

const invokedDirectly = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  const appDir = process.cwd();
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const mode = process.argv[2];
  if (mode === 'pre') await pre(appDir, rootDir);
  else if (mode === 'post') await post(appDir);
  else fail(['[cf-env-guard] usage: check-cloudflare-build-env.mjs <pre|post>']);
}
