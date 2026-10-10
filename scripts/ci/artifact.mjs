#!/usr/bin/env node
/**
 * CI/CD Phase 3 proof of concept: package, verify and dry-run an OpenNext build artifact.
 *
 * NOTHING HERE DEPLOYS. No command executes `wrangler deploy` without `--dry-run`, and the dry run and the local
 * smoke refuse to start if any Cloudflare/Wrangler variable is present in the environment. `deployArgs` only BUILDS
 * the future production argument list (pinned and tested); no CLI command calls it yet.
 *
 *   package          scan apps/<app>/.open-next (+ wrangler.jsonc, package.json, open-next.config.ts) and write
 *                    <app>.open-next.tar.gz, inventory.json and manifest.json to --out
 *   verify           (separate job, no rebuild) check digests/provenance, extract into apps/<app>, re-scan the tree
 *                    against the inventory and prove every symlink target resolves
 *   negative-tests   prove the verifier FAILS for a corrupted archive, a forged self-consistent archive, an injected
 *                    file and a missing symlink target (all in OS temp directories)
 *   dry-run          `wrangler deploy --dry-run` against the extracted artifact, credential-free
 *   local-smoke      run the extracted artifact in local workerd (`wrangler dev --local`, no credentials, dummy
 *                    variables) and smoke-test it over 127.0.0.1
 *
 * Symlinks are archived AS symlinks (never dereferenced). The archive is a self-contained ustar/pax writer and reader
 * (dependency-free, same behaviour on every OS) so extraction can refuse path traversal, hard links, device nodes and
 * writes through symlinks, which no `tar` flavour guarantees.
 */
import crypto from 'node:crypto';
import { once } from 'node:events';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { finished } from 'node:stream/promises';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runSmoke } from './smoke.mjs';
import zlib from 'node:zlib';

export const APPS = ['web', 'admin', 'student'];
export const SCHEMA_VERSION = 1;
export const ROOT_ENTRIES = ['.open-next', 'open-next.config.ts', 'package.json', 'wrangler.jsonc'];
export const CONFIG_FILES = ['open-next.config.ts', 'package.json', 'wrangler.jsonc'];
export const REQUIRED_PATHS = [
  { path: '.open-next/worker.js', type: 'file' },
  { path: '.open-next/assets', type: 'dir' },
  { path: '.open-next/.build/open-next.config.edge.mjs', type: 'file' },
  { path: '.open-next/cloudflare/next-env.mjs', type: 'file' },
  { path: 'open-next.config.ts', type: 'file' },
  { path: 'package.json', type: 'file' },
  { path: 'wrangler.jsonc', type: 'file' }
];
export const EXPECTED_WORKER = { web: 'rms-web', admin: 'rms-admin', student: 'rms-student' };
const TOOL_PACKAGES = { wrangler: 'wrangler', opennextCloudflare: '@opennextjs/cloudflare', next: 'next' };
const BLOCK = 512;
const FULL_SHA = /^[0-9a-f]{40}$/;
const FIXED_MTIME = 315532800; // 1980-01-01: constant so identical input gives an identical archive
const CREDENTIAL_ENV = /^(CLOUDFLARE_|CF_|WRANGLER_)/i;

export class ArtifactError extends Error {
  constructor(problems) {
    super(problems.map((p) => (typeof p === 'string' ? p : `${p.code}: ${p.message}`)).join('\n'));
    this.problems = problems.map((p) => (typeof p === 'string' ? { code: 'error', message: p } : p));
  }
}

const problem = (code, message) => ({ code, message });
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const toPosix = (p) => p.split(path.sep).join('/');
const sha256Buffer = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const archiveName = (app) => `${app}.open-next.tar.gz`;

async function sha256File(file) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

export function parseJsonc(text) {
  let out = '';
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];
    if (inString) {
      out += c;
      if (c === '\\') out += text[++i];
      else if (c === '"') inString = false;
    } else if (c === '"') {
      inString = true;
      out += c;
    } else if (c === '/' && n === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      out += '\n';
    } else if (c === '/' && n === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i++;
    } else out += c;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'));
}

// ---------------------------------------------------------------------------------------------------------------
// Tar (ustar + pax) writer / reader
// ---------------------------------------------------------------------------------------------------------------

const padLength = (size) => (BLOCK - (size % BLOCK)) % BLOCK;
const isAscii = (s) => /^[\x20-\x7e]*$/.test(s);

function octal(value, width) {
  const s = value.toString(8);
  if (s.length > width - 1) throw new Error(`value ${value} does not fit a ${width}-byte tar field`);
  return `${s.padStart(width - 1, '0')}\0`;
}

export function tarHeader({ name, mode, size, type, linkname = '' }) {
  const h = Buffer.alloc(BLOCK);
  const put = (off, len, str) => {
    const b = Buffer.from(str, 'utf8');
    if (b.length > len) throw new Error(`tar field overflow for "${str.slice(0, 40)}"`);
    b.copy(h, off);
  };
  put(0, 100, name);
  h.write(octal(mode, 8), 100, 'latin1');
  h.write(octal(0, 8), 108, 'latin1');
  h.write(octal(0, 8), 116, 'latin1');
  h.write(octal(size, 12), 124, 'latin1');
  h.write(octal(FIXED_MTIME, 12), 136, 'latin1');
  h.fill(0x20, 148, 156);
  h.write(type, 156, 'latin1');
  put(157, 100, linkname);
  h.write('ustar\0', 257, 'latin1');
  h.write('00', 263, 'latin1');
  let sum = 0;
  for (let i = 0; i < BLOCK; i++) sum += h[i];
  h.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148, 'latin1');
  return h;
}

function paxRecord(key, value) {
  const body = Buffer.byteLength(` ${key}=${value}\n`);
  let digits = 1;
  while (String(body + digits).length > digits) digits++;
  return Buffer.from(`${body + digits} ${key}=${value}\n`);
}

async function writeTarEntry(sink, entry) {
  const longName = Buffer.byteLength(entry.name) > 100 || !isAscii(entry.name);
  const longLink = entry.linkname && (Buffer.byteLength(entry.linkname) > 100 || !isAscii(entry.linkname));
  if (longName || longLink) {
    const records = [];
    if (longName) records.push(paxRecord('path', entry.name));
    if (longLink) records.push(paxRecord('linkpath', entry.linkname));
    const body = Buffer.concat(records);
    await sink(tarHeader({ name: 'PaxHeader', mode: 0o644, size: body.length, type: 'x' }));
    await sink(body);
    await sink(Buffer.alloc(padLength(body.length)));
  }
  await sink(
    tarHeader({
      ...entry,
      name: longName ? 'long-name' : entry.name,
      linkname: longLink ? 'long-link' : (entry.linkname ?? '')
    })
  );
}

class ByteReader {
  constructor(stream) {
    this.iterator = stream[Symbol.asyncIterator]();
    this.buffer = Buffer.alloc(0);
    this.done = false;
  }
  async #more() {
    if (this.done) return false;
    const next = await this.iterator.next();
    if (next.done) {
      this.done = true;
      return false;
    }
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, next.value]) : next.value;
    return true;
  }
  async read(n) {
    while (this.buffer.length < n) if (!(await this.#more())) throw new Error('unexpected end of archive');
    const out = this.buffer.subarray(0, n);
    this.buffer = this.buffer.subarray(n);
    return out;
  }
  async take(max) {
    while (this.buffer.length === 0) if (!(await this.#more())) throw new Error('unexpected end of archive');
    const out = this.buffer.subarray(0, Math.min(this.buffer.length, max));
    this.buffer = this.buffer.subarray(out.length);
    return out;
  }
  async drain() {
    while (await this.#more());
    return this.buffer;
  }
}

function parseOctal(buf, what) {
  const s = buf.toString('latin1').replace(/\0.*$/s, '').trim();
  if (!/^[0-7]*$/.test(s)) throw new Error(`corrupt tar header (${what})`);
  return s === '' ? 0 : parseInt(s, 8);
}
const cString = (buf) => buf.toString('utf8').replace(/\0.*$/s, '');

function parsePax(body) {
  const out = {};
  let i = 0;
  while (i < body.length) {
    const space = body.indexOf(0x20, i);
    const len = parseInt(body.subarray(i, space).toString('latin1'), 10);
    if (!Number.isInteger(len) || len <= 0 || i + len > body.length) throw new Error('corrupt pax header');
    const record = body.subarray(space + 1, i + len - 1).toString('utf8');
    const eq = record.indexOf('=');
    out[record.slice(0, eq)] = record.slice(eq + 1);
    i += len;
  }
  return out;
}

/** Reject anything that could escape the destination. Returns the normalised posix path. */
export function safeEntryName(raw) {
  const name = raw.endsWith('/') ? raw.slice(0, -1) : raw;
  if (!name) throw new Error('empty entry name');
  if (name.includes('\0') || name.includes('\\')) throw new Error(`illegal characters in entry name "${raw}"`);
  if (name.startsWith('/') || /^[A-Za-z]:/.test(name)) throw new Error(`absolute entry name "${raw}"`);
  for (const seg of name.split('/')) if (seg === '' || seg === '.' || seg === '..') throw new Error(`unsafe entry name "${raw}"`);
  if (!ROOT_ENTRIES.includes(name.split('/')[0])) throw new Error(`entry outside the artifact layout: "${raw}"`);
  return name;
}

/** Streams a .tar.gz, calling onEntry(entry, body) for each entry. Fails closed on any unsupported construct. */
export async function readTarGz(file, onEntry) {
  const gunzip = zlib.createGunzip();
  const source = fs.createReadStream(file);
  source.on('error', (e) => gunzip.destroy(e));
  source.pipe(gunzip);
  const reader = new ByteReader(gunzip);
  let pax = null;
  for (;;) {
    const h = await reader.read(BLOCK);
    if (h.every((b) => b === 0)) {
      if (!(await reader.read(BLOCK)).every((b) => b === 0)) throw new Error('corrupt end-of-archive marker');
      break;
    }
    const stored = parseOctal(h.subarray(148, 156), 'checksum');
    let sum = 0;
    for (let i = 0; i < BLOCK; i++) sum += i >= 148 && i < 156 ? 0x20 : h[i];
    if (sum !== stored) throw new Error('tar header checksum mismatch');
    if (cString(h.subarray(257, 262)) !== 'ustar') throw new Error('unsupported tar format');
    const type = String.fromCharCode(h[156]);
    const size = parseOctal(h.subarray(124, 136), 'size');
    const prefix = cString(h.subarray(345, 500));
    let name = (prefix ? `${prefix}/` : '') + cString(h.subarray(0, 100));
    let linkname = cString(h.subarray(157, 257));
    const mode = parseOctal(h.subarray(100, 108), 'mode');
    if (type === 'x') {
      const body = await reader.read(size);
      await reader.read(padLength(size));
      pax = parsePax(body);
      if ('size' in pax) throw new Error('pax size override is not supported');
      continue;
    }
    if (pax?.path) name = pax.path;
    if (pax?.linkpath) linkname = pax.linkpath;
    pax = null;
    if (!['0', '\0', '5', '2'].includes(type)) throw new Error(`unsupported tar entry type "${type}" for "${name}"`);
    if (type !== '0' && type !== '\0' && size !== 0) throw new Error(`non-file entry with a body: "${name}"`);
    const entry = { name: safeEntryName(name), type: type === '\0' ? '0' : type, mode, size, linkname };
    const body = {
      remaining: size,
      async *chunks() {
        while (this.remaining > 0) {
          const chunk = await reader.take(this.remaining);
          this.remaining -= chunk.length;
          yield chunk;
        }
      }
    };
    await onEntry(entry, body);
    while (body.remaining > 0) body.remaining -= (await reader.take(body.remaining)).length;
    await reader.read(padLength(size));
  }
  const rest = await reader.drain(); // also forces the gzip CRC / trailer check
  if (rest.some((b) => b !== 0)) throw new Error('unexpected data after end-of-archive marker');
}

async function writeArchive(appDir, entries, outFile) {
  const gz = zlib.createGzip({ level: 6 });
  const out = fs.createWriteStream(outFile);
  gz.pipe(out);
  const done = finished(out);
  const sink = async (buf) => {
    if (!gz.write(buf)) await once(gz, 'drain');
  };
  try {
    for (const e of entries) {
      if (e.type === 'dir') await writeTarEntry(sink, { name: `${e.path}/`, type: '5', mode: 0o755, size: 0 });
      else if (e.type === 'symlink') await writeTarEntry(sink, { name: e.path, type: '2', mode: 0o777, size: 0, linkname: e.target });
      else {
        await writeTarEntry(sink, { name: e.path, type: '0', mode: e.mode, size: e.size });
        const hash = crypto.createHash('sha256');
        let bytes = 0;
        for await (const chunk of fs.createReadStream(path.join(appDir, ...e.path.split('/')))) {
          bytes += chunk.length;
          hash.update(chunk);
          await sink(chunk);
        }
        if (bytes !== e.size || hash.digest('hex') !== e.sha256) throw new Error(`file changed while packaging: ${e.path}`);
        await sink(Buffer.alloc(padLength(e.size)));
      }
    }
    await sink(Buffer.alloc(BLOCK * 2));
    gz.end();
    await done;
  } catch (err) {
    done.catch(() => {});
    gz.destroy();
    out.destroy();
    throw err;
  }
}

function linkType(target, linkPath) {
  if (process.platform !== 'win32') return undefined;
  try {
    return fs.statSync(path.resolve(path.dirname(linkPath), target)).isDirectory() ? 'dir' : 'file';
  } catch {
    return 'file';
  }
}

/**
 * Extract into destDir. Never writes through a symlink and never overwrites except the three config files.
 * When `expected` (a Map of path -> inventory entry) is given, extraction is bound to it: an entry that is not
 * listed, is listed twice, has a different type, size or link target is rejected BEFORE anything is written for it,
 * and every listed entry must be present at the end.
 */
export async function extractArchive(archiveFile, destDir, expected = null) {
  const symlinks = new Set();
  const seen = new Set();
  await readTarGz(archiveFile, async (entry, body) => {
    if (expected) {
      const want = expected.get(entry.name);
      const type = { 0: 'file', 5: 'dir', 2: 'symlink' }[entry.type];
      if (!want) throw new Error(`archive entry not in the inventory: ${entry.name}`);
      if (seen.has(entry.name)) throw new Error(`duplicate archive entry: ${entry.name}`);
      seen.add(entry.name);
      if (want.type !== type) throw new Error(`archive entry type differs from the inventory: ${entry.name}`);
      if (type === 'file' && want.size !== entry.size) throw new Error(`archive entry size differs from the inventory: ${entry.name}`);
      if (type === 'symlink' && want.target !== entry.linkname) throw new Error(`archive symlink target differs from the inventory: ${entry.name}`);
    }
    const segments = entry.name.split('/');
    for (let i = 1; i < segments.length; i++) {
      if (symlinks.has(segments.slice(0, i).join('/'))) throw new Error(`entry "${entry.name}" is inside a symlink`);
    }
    const target = path.join(destDir, ...segments);
    await fsp.mkdir(path.dirname(target), { recursive: true });
    if (entry.type === '5') await fsp.mkdir(target, { recursive: true });
    else if (entry.type === '2') {
      symlinks.add(entry.name);
      fs.symlinkSync(entry.linkname, target, linkType(entry.linkname, target));
    } else {
      const overwrite = CONFIG_FILES.includes(entry.name);
      if (overwrite) {
        const st = await fsp.lstat(target).catch(() => null);
        if (st && !st.isFile()) throw new Error(`refusing to overwrite non-file ${entry.name}`);
      }
      const handle = await fsp.open(target, overwrite ? 'w' : 'wx', entry.mode & 0o777);
      try {
        let written = 0;
        for await (const chunk of body.chunks()) {
          written += chunk.length;
          await handle.write(chunk);
        }
        if (written !== entry.size) throw new Error(`short write for ${entry.name}`);
      } finally {
        await handle.close();
      }
    }
  });
  if (expected && seen.size !== expected.size) throw new Error(`archive is missing ${expected.size - seen.size} inventory entries`);
}

// ---------------------------------------------------------------------------------------------------------------
// Inventory, symlinks, manifest
// ---------------------------------------------------------------------------------------------------------------

const normaliseLink = (t) => (process.platform === 'win32' ? t.replace(/^\\\\\?\\/, '') : t);

/** lstat-based walk (never follows symlinks) of the artifact layout. */
export async function scanTree(appDir) {
  const entries = [];
  const problems = [];
  async function walk(abs, rel) {
    const st = await fsp.lstat(abs);
    if (st.isSymbolicLink()) entries.push({ path: rel, type: 'symlink', target: normaliseLink(await fsp.readlink(abs)) });
    else if (st.isDirectory()) {
      entries.push({ path: rel, type: 'dir' });
      for (const name of (await fsp.readdir(abs)).sort(cmp)) await walk(path.join(abs, name), `${rel}/${name}`);
    } else if (st.isFile()) {
      entries.push({ path: rel, type: 'file', size: st.size, mode: st.mode & 0o111 ? 0o755 : 0o644, sha256: await sha256File(abs) });
    } else problems.push(problem('unsupported-type', `unsupported file type at ${rel}`));
  }
  for (const top of ROOT_ENTRIES) {
    const abs = path.join(appDir, top);
    if (!(await fsp.lstat(abs).catch(() => null))) problems.push(problem('missing-path', `missing ${top}`));
    else await walk(abs, top);
  }
  entries.sort((a, b) => cmp(a.path, b.path));
  return { entries, problems };
}

const isInside = (child, parent) => {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};

/** Resolve every symlink in the entries against the CURRENT filesystem. */
export function analyseSymlinks(appDir, repoRoot, entries) {
  const root = fs.realpathSync(repoRoot);
  const appReal = fs.realpathSync(appDir);
  return entries
    .filter((e) => e.type === 'symlink')
    .map((e) => {
      const abs = path.join(appDir, ...e.path.split('/'));
      const info = { path: e.path, target: e.target, absolute: path.isAbsolute(e.target) || /^[A-Za-z]:/.test(e.target), resolves: false, kind: null, insideRepo: false, repoRelative: null };
      try {
        const real = fs.realpathSync(abs);
        info.resolves = true;
        info.kind = fs.statSync(abs).isDirectory() ? 'dir' : 'file';
        // Canonical key independent of where the app directory lives: links into the artifact's own app
        // directory are "@app/...", links into the rest of the checkout (node_modules/.pnpm) are repo-relative.
        if (isInside(real, appReal)) {
          info.insideRepo = true;
          info.repoRelative = `@app/${toPosix(path.relative(appReal, real))}`;
        } else if (isInside(real, root)) {
          info.insideRepo = true;
          info.repoRelative = toPosix(path.relative(root, real));
        }
      } catch {
        /* dangling */
      }
      return info;
    });
}

function readPackageVersion(fromDir, pkg) {
  try {
    const req = createRequire(path.join(fromDir, 'package.json'));
    return JSON.parse(fs.readFileSync(req.resolve(`${pkg}/package.json`), 'utf8')).version;
  } catch {
    try {
      let dir = path.dirname(createRequire(path.join(fromDir, 'package.json')).resolve(pkg));
      while (dir !== path.dirname(dir)) {
        const f = path.join(dir, 'package.json');
        if (fs.existsSync(f) && JSON.parse(fs.readFileSync(f, 'utf8')).name === pkg) return JSON.parse(fs.readFileSync(f, 'utf8')).version;
        dir = path.dirname(dir);
      }
    } catch {
      /* fall through */
    }
    return 'unresolved';
  }
}

function collectTools(repoRoot, app) {
  const appDir = path.join(repoRoot, 'apps', app);
  const tools = { node: process.version };
  for (const [key, pkg] of Object.entries(TOOL_PACKAGES)) tools[key] = readPackageVersion(appDir, pkg);
  return tools;
}

function gitSha(repoRoot) {
  try {
    // Only trust a repository whose top level IS repoRoot: a directory nested inside some other checkout must not
    // inherit that checkout's HEAD.
    const norm = (p) => path.resolve(fs.realpathSync(p)).replace(/\\/g, '/').toLowerCase();
    const top = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: repoRoot, encoding: 'utf8' }).trim();
    if (norm(top) !== norm(repoRoot)) return 'unknown';
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function checkWranglerLayout(appDir, app) {
  const problems = [];
  try {
    const cfg = parseJsonc(fs.readFileSync(path.join(appDir, 'wrangler.jsonc'), 'utf8'));
    if (app && EXPECTED_WORKER[app] && cfg.name !== EXPECTED_WORKER[app]) problems.push(problem('worker-name-mismatch', `wrangler name is "${cfg.name}", expected ${EXPECTED_WORKER[app]} for ${app}`));
    if (cfg.main !== '.open-next/worker.js') problems.push(problem('wrangler-layout', `wrangler main is "${cfg.main}", expected .open-next/worker.js`));
    if (cfg.assets?.directory !== '.open-next/assets') problems.push(problem('wrangler-layout', `wrangler assets.directory is "${cfg.assets?.directory}", expected .open-next/assets`));
    return { problems, name: cfg.name };
  } catch (err) {
    return { problems: [problem('wrangler-layout', `cannot read wrangler.jsonc: ${err.message}`)], name: null };
  }
}

/**
 * worker.js only re-exports/imports sibling files that wrangler bundles at deploy time. Every relative specifier it
 * uses must be in the artifact, otherwise the build is incomplete (e.g. no server-functions/default/handler.mjs).
 */
export function workerImportProblems(appDir, entries) {
  const file = path.join(appDir, '.open-next', 'worker.js');
  let source;
  try {
    source = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const byPath = new Map(entries.map((e) => [e.path, e]));
  const problems = [];
  const specifiers = new Set();
  for (const m of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["'](\.{1,2}\/[^"']+)["']/g)) specifiers.add(m[1]);
  for (const spec of specifiers) {
    const resolved = path.posix.normalize(path.posix.join('.open-next', spec));
    if (resolved.startsWith('..') || byPath.get(resolved)?.type !== 'file') problems.push(problem('worker-import-missing', `worker.js imports "${spec}" which is not in the artifact (${resolved})`));
  }
  if (specifiers.size === 0 && /\bimport\b|\bexport\b[^;]*\bfrom\b/.test(source)) problems.push(problem('worker-import-parse', 'worker.js has imports but none could be parsed'));
  return problems;
}

function checkRequired(entries) {
  const byPath = new Map(entries.map((e) => [e.path, e]));
  return REQUIRED_PATHS.filter((r) => byPath.get(r.path)?.type !== r.type).map((r) => problem('missing-required', `required ${r.type} missing: ${r.path}`));
}

const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;

/** Build side. Scans, archives, and writes manifest.json + inventory.json into outDir. */
export async function packageArtifact({ app, repoRoot, outDir, appDir = path.join(repoRoot, 'apps', app), env = process.env }) {
  if (!APPS.includes(app)) throw new ArtifactError([problem('bad-app', `unknown app "${app}"`)]);
  // SOURCE_SHA names the commit being built (needed when GITHUB_SHA is not that commit, e.g. workflow_run). Fail closed
  // unless the checkout is exactly that commit.
  if (env.SOURCE_SHA) {
    const head = gitSha(repoRoot);
    if (!FULL_SHA.test(env.SOURCE_SHA)) throw new ArtifactError([problem('source-sha-invalid', 'SOURCE_SHA must be a full 40-character lowercase commit SHA')]);
    if (head !== env.SOURCE_SHA) throw new ArtifactError([problem('source-sha-mismatch', `SOURCE_SHA is ${env.SOURCE_SHA.slice(0, 12)} but the checkout is ${head === 'unknown' ? 'not a git checkout' : head.slice(0, 12)}`)]);
  }
  const { entries, problems } = await scanTree(appDir);
  problems.push(...checkRequired(entries));
  const layout = checkWranglerLayout(appDir, app);
  problems.push(...layout.problems, ...workerImportProblems(appDir, entries));
  const symlinks = analyseSymlinks(appDir, repoRoot, entries);
  for (const s of symlinks) {
    if (!s.resolves) problems.push(problem('symlink-dangling', `symlink does not resolve at build time: ${s.path} -> ${s.target}`));
    else if (!s.insideRepo) problems.push(problem('symlink-outside-repo', `symlink leaves the repository: ${s.path} -> ${s.target}`));
  }
  if (problems.length) throw new ArtifactError(problems);

  await fsp.mkdir(outDir, { recursive: true });
  const archiveFile = path.join(outDir, archiveName(app));
  await writeArchive(appDir, entries, archiveFile);
  const stat = await fsp.stat(archiveFile);
  const inventoryText = stable({ schemaVersion: SCHEMA_VERSION, entries });
  await fsp.writeFile(path.join(outDir, 'inventory.json'), inventoryText);
  const files = entries.filter((e) => e.type === 'file');
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    kind: 'rms-open-next-artifact',
    app,
    worker: layout.name,
    source: {
      repository: env.GITHUB_REPOSITORY ?? null,
      sha: env.SOURCE_SHA ?? env.GITHUB_SHA ?? gitSha(repoRoot),
      ref: env.GITHUB_REF ?? null,
      workflow: env.GITHUB_WORKFLOW ?? null,
      runId: env.GITHUB_RUN_ID ?? null,
      runAttempt: env.GITHUB_RUN_ATTEMPT ?? null
    },
    createdAt: new Date().toISOString(),
    repoRoot: fs.realpathSync(repoRoot),
    lockfileSha256: sha256Buffer(await fsp.readFile(path.join(repoRoot, 'pnpm-lock.yaml'))),
    tools: collectTools(repoRoot, app),
    platform: { os: process.platform, arch: process.arch },
    artifact: { file: archiveName(app), bytes: stat.size, sha256: await sha256File(archiveFile) },
    inventory: {
      file: 'inventory.json',
      sha256: sha256Buffer(Buffer.from(inventoryText)),
      counts: { files: files.length, symlinks: symlinks.length, directories: entries.filter((e) => e.type === 'dir').length },
      totalBytes: files.reduce((n, f) => n + f.size, 0)
    },
    symlinks: symlinks.map(({ path: p, target, absolute, kind, repoRelative }) => ({ path: p, target, absolute, kind, repoRelative })),
    requiredPaths: REQUIRED_PATHS
  };
  const manifestText = stable(manifest);
  await fsp.writeFile(path.join(outDir, 'manifest.json'), manifestText);
  // Returned for the caller to publish through an independent channel (job output); deliberately not in the file.
  return Object.assign(manifest, { manifestSha256: sha256Buffer(Buffer.from(manifestText)) });
}

function diffInventory(expected, actual) {
  const out = [];
  const want = new Map(expected.map((e) => [e.path, e]));
  const have = new Map(actual.map((e) => [e.path, e]));
  for (const [p, e] of want) {
    const a = have.get(p);
    if (!a) out.push(problem('missing-file', `missing from extracted tree: ${p}`));
    else if (a.type !== e.type) out.push(problem('type-mismatch', `${p}: expected ${e.type}, found ${a.type}`));
    else if (e.type === 'file' && (a.size !== e.size || a.sha256 !== e.sha256)) out.push(problem('content-mismatch', `content differs from inventory: ${p}`));
    else if (e.type === 'symlink' && a.target !== e.target) out.push(problem('symlink-changed', `symlink target changed: ${p} (${e.target} -> ${a.target})`));
    else if (e.type === 'file' && process.platform !== 'win32' && a.mode !== e.mode) out.push(problem('mode-mismatch', `file mode differs: ${p}`));
  }
  for (const p of have.keys()) if (!want.has(p)) out.push(problem('extra-file', `not in inventory: ${p}`));
  return out;
}

/** Post-extraction checks against the CURRENT filesystem. Used by verifyArtifact and the negative tests. */
export async function verifyExtractedTree({ appDir, repoRoot, manifest, inventory }) {
  const problems = [];
  const { entries, problems: scanProblems } = await scanTree(appDir);
  problems.push(
    ...scanProblems,
    ...diffInventory(inventory.entries, entries),
    ...checkRequired(entries),
    ...workerImportProblems(appDir, entries),
    ...checkWranglerLayout(appDir, manifest.app).problems
  );
  const live = analyseSymlinks(appDir, repoRoot, entries);
  const recorded = new Map(manifest.symlinks.map((s) => [s.path, s]));
  for (const s of live) {
    const r = recorded.get(s.path);
    if (!s.resolves) problems.push(problem('symlink-dangling', `required symlink target does not resolve: ${s.path} -> ${s.target}`));
    else if (!s.insideRepo) problems.push(problem('symlink-outside-repo', `symlink resolves outside the repository: ${s.path}`));
    else if (r && (r.kind !== s.kind || r.repoRelative !== s.repoRelative)) problems.push(problem('symlink-retargeted', `symlink resolves differently than at build time: ${s.path}`));
  }
  for (const r of recorded.keys()) if (!live.some((s) => s.path === r)) problems.push(problem('symlink-missing', `recorded symlink absent: ${r}`));
  return { problems, symlinks: live, entries };
}

/**
 * The build job hands the verify job `<app>:<64 lowercase hex>` (SHA-256 of manifest.json) through a job output. The
 * label makes the app-to-digest association explicit and checkable: an empty value, a malformed value, or a digest
 * published for another app is a hard failure, never a silent fallback.
 */
export function parseExpectedDigest(app, token) {
  if (token === undefined || token === null || String(token).trim() === '') {
    return { problem: problem('missing-expectation', 'no manifest digest was handed over by the build job (empty hand-off)') };
  }
  const m = /^(web|admin|student):([0-9a-f]{64})$/.exec(String(token).trim());
  if (!m) return { problem: problem('bad-expectation', 'malformed manifest digest hand-off (expected "<app>:<64 lowercase hex>")') };
  if (m[1] !== app) return { problem: problem('digest-app-mismatch', `the digest was published for "${m[1]}" but this job verifies "${app}"`) };
  return { manifestSha256: m[2] };
}

/** Lexical pre-extraction check: no symlink may point outside the app directory or the repository checkout. */
export function symlinkPolicyProblems(entries, appDir, repoRoot) {
  const app = path.resolve(appDir);
  const root = path.resolve(repoRoot);
  return entries
    .filter((e) => e.type === 'symlink')
    .flatMap((e) => {
      const resolved = path.resolve(path.dirname(path.join(app, ...e.path.split('/'))), e.target);
      return isInside(resolved, app) || isInside(resolved, root) ? [] : [problem('symlink-escapes', `symlink would point outside the app directory and repository: ${e.path} -> ${e.target}`)];
    });
}

/**
 * Verify side (separate job; no rebuild). Extracts into appDir, which must not already contain .open-next.
 *
 * TRUST MODEL. The artifact is untrusted storage. The only trust anchors are values supplied by the caller from
 * OUTSIDE the artifact: expect.sha (the commit being verified), expect.runId and expect.manifestSha256 (the SHA-256 of
 * manifest.json, published by the build job as a job output). The manifest in turn pins the archive digest and the
 * inventory digest, and extraction is bound to the inventory. With expect.strict, a missing anchor is itself a failure.
 */
export async function verifyArtifact({ app, dir, repoRoot, appDir = path.join(repoRoot, 'apps', app), expect = {} }) {
  const problems = [];
  const fail = () => ({ ok: false, problems, report: null });
  if (expect.strict) {
    for (const key of ['sha', 'runId', 'manifestSha256']) if (!expect[key]) problems.push(problem('missing-expectation', `no independent expectation supplied for ${key}: refusing to verify`));
    if (problems.length) return fail();
  }
  let manifest;
  let manifestText;
  let inventoryText;
  try {
    manifestText = await fsp.readFile(path.join(dir, 'manifest.json'));
    manifest = JSON.parse(manifestText.toString('utf8'));
    inventoryText = await fsp.readFile(path.join(dir, 'inventory.json'));
  } catch (err) {
    problems.push(problem('unreadable-artifact', `cannot read manifest/inventory: ${err.message}`));
    return fail();
  }
  if (expect.manifestSha256 && sha256Buffer(manifestText) !== expect.manifestSha256) problems.push(problem('expected-digest-mismatch', 'manifest.json does not match the independently supplied digest'));
  if (manifest.schemaVersion !== SCHEMA_VERSION || manifest.kind !== 'rms-open-next-artifact') problems.push(problem('bad-manifest', 'unexpected manifest schema'));
  if (manifest.app !== app) problems.push(problem('app-mismatch', `artifact is for "${manifest.app}", expected "${app}"`));
  if (manifest.worker !== EXPECTED_WORKER[app]) problems.push(problem('worker-name-mismatch', `artifact targets worker "${manifest.worker}", expected ${EXPECTED_WORKER[app]}`));
  if (manifest.artifact?.file !== archiveName(app)) problems.push(problem('bad-manifest', `unexpected archive file name "${manifest.artifact?.file}"`));
  if (expect.sha && manifest.source?.sha !== expect.sha) problems.push(problem('source-sha-mismatch', `built from ${manifest.source?.sha}, expected ${expect.sha}`));
  if (expect.runId && String(manifest.source?.runId) !== String(expect.runId)) problems.push(problem('run-id-mismatch', `built in run ${manifest.source?.runId}, expected ${expect.runId}`));

  const archiveFile = path.join(dir, archiveName(app));
  const archiveStat = await fsp.stat(archiveFile).catch(() => null);
  if (!archiveStat) problems.push(problem('archive-missing', `archive not found: ${path.basename(archiveFile)}`));
  else if (manifest.artifact) {
    const digest = await sha256File(archiveFile);
    if (archiveStat.size !== manifest.artifact.bytes) problems.push(problem('digest-mismatch', `archive size ${archiveStat.size} != manifest ${manifest.artifact.bytes}`));
    if (digest !== manifest.artifact.sha256) problems.push(problem('digest-mismatch', 'archive sha256 does not match manifest'));
  }
  if (sha256Buffer(inventoryText) !== manifest.inventory?.sha256) problems.push(problem('inventory-digest-mismatch', 'inventory.json does not match manifest'));
  if (problems.length) return fail(); // nothing is extracted from an artifact that failed provenance

  // Only absolute symlinks pin the artifact to the build location. Linux OpenNext output has none (every link is
  // relative and resolves inside .open-next); the Windows output has absolute links into node_modules/.pnpm.
  if (manifest.symlinks.some((l) => l.absolute) && path.resolve(manifest.repoRoot) !== path.resolve(fs.realpathSync(repoRoot))) {
    problems.push(problem('repo-root-mismatch', `built at ${manifest.repoRoot} but verifying at ${repoRoot}: absolute symlinks would not resolve`));
  }
  const lock = sha256Buffer(await fsp.readFile(path.join(repoRoot, 'pnpm-lock.yaml')));
  if (lock !== manifest.lockfileSha256) problems.push(problem('lockfile-mismatch', 'pnpm-lock.yaml differs from the one used to build'));
  const tools = collectTools(repoRoot, app);
  for (const key of Object.keys(TOOL_PACKAGES)) if (tools[key] !== manifest.tools?.[key]) problems.push(problem('tool-mismatch', `${key} is ${tools[key]} here but ${manifest.tools?.[key]} at build`));
  if (await fsp.lstat(path.join(appDir, '.open-next')).catch(() => null)) problems.push(problem('not-clean', `${path.join(appDir, '.open-next')} already exists: refusing to mix a build with an artifact`));
  if (problems.length) return fail();

  const checkout = {};
  for (const f of CONFIG_FILES) {
    const p = path.join(appDir, f);
    if (fs.existsSync(p)) checkout[f] = await sha256File(p);
  }
  const inventory = JSON.parse(inventoryText.toString('utf8'));
  problems.push(...symlinkPolicyProblems(inventory.entries, appDir, repoRoot));
  if (problems.length) return fail(); // nothing is extracted when a link would escape
  try {
    await extractArchive(archiveFile, appDir, new Map(inventory.entries.map((e) => [e.path, e])));
  } catch (err) {
    problems.push(problem('extract-failed', err.message));
    return fail();
  }
  const tree = await verifyExtractedTree({ appDir, repoRoot, manifest, inventory });
  problems.push(...tree.problems);
  for (const [f, sha] of Object.entries(checkout)) {
    const inArchive = inventory.entries.find((e) => e.path === f)?.sha256;
    if (inArchive !== sha) problems.push(problem('config-differs-from-checkout', `${f} in the artifact differs from the checked-out file`));
  }
  const report = {
    app,
    ok: problems.length === 0,
    sourceSha: manifest.source.sha,
    runId: manifest.source.runId,
    archiveSha256: manifest.artifact.sha256,
    archiveBytes: manifest.artifact.bytes,
    counts: manifest.inventory.counts,
    totalBytes: manifest.inventory.totalBytes,
    symlinks: { total: tree.symlinks.length, resolved: tree.symlinks.filter((s) => s.resolves).length, absolute: tree.symlinks.filter((s) => s.absolute).length },
    tools: manifest.tools,
    builtOn: manifest.platform
  };
  return { ok: problems.length === 0, problems, report };
}

// ---------------------------------------------------------------------------------------------------------------
// Negative tests (OS temp directories only)
// ---------------------------------------------------------------------------------------------------------------

async function copyDir(src, dest) {
  await fsp.mkdir(dest, { recursive: true });
  for (const f of await fsp.readdir(src)) await fsp.copyFile(path.join(src, f), path.join(dest, f));
}

export async function runNegativeTests({ app, dir, repoRoot }) {
  const results = [];
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), `artifact-neg-${app}-`));
  const record = (name, expectCode, problems, note = '') => {
    const detected = problems.some((p) => p.code === expectCode);
    results.push({ name, expectedFailure: expectCode, detected, codes: [...new Set(problems.map((p) => p.code))], note });
  };
  const originalManifestText = await fsp.readFile(path.join(dir, 'manifest.json'));
  const originalManifestSha = sha256Buffer(originalManifestText);
  const original = JSON.parse(originalManifestText.toString('utf8'));
  const inventory = JSON.parse(await fsp.readFile(path.join(dir, 'inventory.json'), 'utf8'));
  const freshApp = async (label) => {
    const d = path.join(tmp, label);
    await fsp.mkdir(d, { recursive: true });
    return d;
  };
  try {
    // 0. positive control: the genuine artifact verifies in a clean directory
    const controlApp = await freshApp('control');
    const control = await verifyArtifact({ app, dir, repoRoot, appDir: controlApp, expect: { manifestSha256: originalManifestSha } });
    results.push({ name: 'positive control (genuine artifact)', expectedFailure: null, detected: control.ok, codes: control.problems.map((p) => p.code), note: control.ok ? 'verifies cleanly' : 'GENUINE ARTIFACT FAILED' });

    // 1. one flipped byte in the archive
    const corruptDir = path.join(tmp, 'corrupt');
    await copyDir(dir, corruptDir);
    const archivePath = path.join(corruptDir, original.artifact.file);
    const bytes = await fsp.readFile(archivePath);
    bytes[Math.floor(bytes.length / 2)] ^= 0xff;
    await fsp.writeFile(archivePath, bytes);
    const corrupt = await verifyArtifact({ app, dir: corruptDir, repoRoot, appDir: await freshApp('corrupt-app') });
    record('modified artifact: one byte flipped', 'digest-mismatch', corrupt.problems, corrupt.ok ? '' : 'rejected before extraction');
    results[results.length - 1].extractedAnything = fs.readdirSync(path.join(tmp, 'corrupt-app')).length > 0;

    // 2. forged archive with a self-consistent manifest: only the independently supplied digest can catch it
    const forgeApp = await freshApp('forge-src');
    const forgeExtract = await verifyArtifact({ app, dir, repoRoot, appDir: forgeApp });
    if (forgeExtract.ok) {
      await fsp.appendFile(path.join(forgeApp, '.open-next', 'worker.js'), '\n// tampered\n');
      const forgedDir = path.join(tmp, 'forged');
      const forged = await packageArtifact({ app, repoRoot, appDir: forgeApp, outDir: forgedDir, env: { ...process.env, GITHUB_SHA: original.source.sha, GITHUB_RUN_ID: original.source.runId ?? undefined } });
      const withoutDigest = await verifyArtifact({ app, dir: forgedDir, repoRoot, appDir: await freshApp('forged-a') });
      const withDigest = await verifyArtifact({ app, dir: forgedDir, repoRoot, appDir: await freshApp('forged-b'), expect: { manifestSha256: originalManifestSha } });
      record('forged artifact with rewritten manifest', 'expected-digest-mismatch', withDigest.problems, `passes WITHOUT an independent digest: ${withoutDigest.ok} (so the independent manifest digest is load-bearing); forged manifest sha ${forged.manifestSha256.slice(0, 12)}`);
    } else results.push({ name: 'forged artifact with rewritten manifest', expectedFailure: 'expected-digest-mismatch', detected: false, codes: forgeExtract.problems.map((p) => p.code), note: 'could not set up' });

    // 2b. the manifest alone is edited (archive untouched): invisible without the independent digest
    const editedDir = path.join(tmp, 'edited-manifest');
    await copyDir(dir, editedDir);
    await fsp.writeFile(path.join(editedDir, 'manifest.json'), JSON.stringify({ ...original, createdAt: '2000-01-01T00:00:00.000Z' }, null, 2) + String.fromCharCode(10));
    const editedWith = await verifyArtifact({ app, dir: editedDir, repoRoot, appDir: await freshApp('edited-a'), expect: { manifestSha256: originalManifestSha } });
    const editedWithout = await verifyArtifact({ app, dir: editedDir, repoRoot, appDir: await freshApp('edited-b') });
    record('manifest edited, archive untouched', 'expected-digest-mismatch', editedWith.problems, 'accepted WITHOUT the independent digest: ' + editedWithout.ok);

    // 2c. verification with no independent expectations is refused when strict (the CLI default)
    const strict = await verifyArtifact({ app, dir, repoRoot, appDir: await freshApp('strict'), expect: { strict: true } });
    record('verify without independent expectations (strict)', 'missing-expectation', strict.problems);

    // 2d. extraction is bound to the inventory: an archive carrying an unlisted file is rejected before it is written
    const extraSrc = await freshApp('extra-src');
    const extraBase = await verifyArtifact({ app, dir, repoRoot, appDir: extraSrc });
    if (extraBase.ok) {
      await fsp.writeFile(path.join(extraSrc, '.open-next', 'unlisted.js'), 'export {}');
      const extraDir = path.join(tmp, 'extra-archive');
      await packageArtifact({ app, repoRoot, appDir: extraSrc, outDir: extraDir, env: { ...process.env, GITHUB_SHA: original.source.sha } });
      const dest = await freshApp('extra-dest');
      let message = '';
      try {
        await extractArchive(path.join(extraDir, original.artifact.file), dest, new Map(inventory.entries.map((e) => [e.path, e])));
      } catch (err) {
        message = err.message;
      }
      const wroteIt = fs.existsSync(path.join(dest, '.open-next', 'unlisted.js'));
      record('archive contains a file not in the inventory', 'extract-failed', message ? [problem('extract-failed', message)] : [], 'unlisted file written to disk: ' + wroteIt);
    }

    // 3. an unexpected file appears in the extracted tree
    const injectApp = await freshApp('inject');
    const inj = await verifyArtifact({ app, dir, repoRoot, appDir: injectApp });
    if (inj.ok) {
      await fsp.writeFile(path.join(injectApp, '.open-next', 'injected.js'), 'export {}');
      const tree = await verifyExtractedTree({ appDir: injectApp, repoRoot, manifest: original, inventory });
      record('extra file injected into extracted tree', 'extra-file', tree.problems);
    }

    // 4. a required symlink target is missing: (a) the link is re-pointed, (b) manifest and link both claim a missing target
    const firstLink = original.symlinks[0];
    if (!firstLink) results.push({ name: 'missing symlink target', expectedFailure: 'symlink-dangling', detected: false, codes: [], note: 'this artifact has no symlinks: nothing to test' });
    else {
      const linkApp = await freshApp('dangling');
      const base = await verifyArtifact({ app, dir, repoRoot, appDir: linkApp });
      if (base.ok) {
        const linkAbs = path.join(linkApp, ...firstLink.path.split('/'));
        const missing = path.join(tmp, 'does-not-exist', 'target');
        fs.unlinkSync(linkAbs);
        fs.symlinkSync(missing, linkAbs, 'dir');
        const a = await verifyExtractedTree({ appDir: linkApp, repoRoot, manifest: original, inventory });
        record('required symlink target missing (link re-pointed)', 'symlink-dangling', a.problems);
        const forgedInventory = { ...inventory, entries: inventory.entries.map((e) => (e.path === firstLink.path ? { ...e, target: missing } : e)) };
        const b = await verifyExtractedTree({ appDir: linkApp, repoRoot, manifest: original, inventory: forgedInventory });
        record('required symlink target missing (inventory forged to match)', 'symlink-dangling', b.problems, 'caught by live resolution, not by the inventory');
      }
    }
  } finally {
    await fsp.rm(tmp, { recursive: true, force: true });
  }
  const ok = results.every((r) => (r.expectedFailure === null ? r.detected : r.detected));
  return { ok, results };
}

// ---------------------------------------------------------------------------------------------------------------
// wrangler dry run (credential-free; cannot deploy)
// ---------------------------------------------------------------------------------------------------------------

export function dryRunArgs(wranglerBin, outDir) {
  // `--dry-run` is mandatory. `--config` plus OPEN_NEXT_DEPLOY stop wrangler delegating to `opennextjs-cloudflare deploy`.
  return [wranglerBin, 'deploy', '--dry-run', '--config', 'wrangler.jsonc', '--outdir', outDir];
}

export function credentialEnvNames(env) {
  return Object.keys(env).filter((k) => CREDENTIAL_ENV.test(k) && env[k] !== '');
}

export function dryRunDeploy({ app, repoRoot, outDir, appDir = path.join(repoRoot, 'apps', app), env = process.env }) {
  const present = credentialEnvNames(env);
  if (present.length) throw new ArtifactError([problem('credentials-present', `refusing to run: Cloudflare/Wrangler variables are set (${present.join(', ')}). The dry run must be credential-free.`)]);
  const req = createRequire(path.join(appDir, 'package.json'));
  const wranglerBin = path.join(path.dirname(req.resolve('wrangler/package.json')), 'bin', 'wrangler.js');
  if (!fs.existsSync(wranglerBin)) throw new ArtifactError([problem('wrangler-missing', 'installed wrangler binary not found')]);
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'wrangler-home-'));
  const childEnv = {
    ...env,
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: path.join(home, '.config'),
    APPDATA: path.join(home, 'AppData'),
    WRANGLER_SEND_METRICS: 'false',
    WRANGLER_HIDE_BANNER: 'true',
    OPEN_NEXT_DEPLOY: 'true',
    CI: 'true'
  };
  try {
    const args = dryRunArgs(wranglerBin, outDir);
    if (!args.includes('--dry-run')) throw new Error('internal error: --dry-run missing'); // belt and braces
    const res = spawnSync(process.execPath, args, { cwd: appDir, env: childEnv, encoding: 'utf8', timeout: 600_000, maxBuffer: 64 * 1024 * 1024 });
    const output = `${res.stdout ?? ''}${res.stderr ?? ''}`;
    const problems = [];
    if (res.status !== 0) problems.push(problem('dry-run-failed', `wrangler dry run exited with ${res.status}`));
    if (!output.includes('--dry-run: exiting now')) problems.push(problem('dry-run-not-confirmed', 'wrangler did not report that it exited after the dry run'));
    if (/Uploaded|Deployed|Current Version ID/i.test(output)) problems.push(problem('deploy-detected', 'output looks like a real deployment: STOP'));
    const bundle = fs.existsSync(outDir) ? fs.readdirSync(outDir) : [];
    if (bundle.length === 0) problems.push(problem('no-bundle', 'dry run produced no bundle in --outdir'));
    // eslint-disable-next-line no-control-regex
    const lines = output.replace(/\u001b\[[0-9;]*m/g, '').split(/\r?\n/).filter(Boolean);
    const summary = lines.filter((l) => /Total Upload|Read \d+ files|^env\.|--dry-run: exiting now/.test(l.trim()));
    const bundleWarnings = lines.filter((l) => /\[WARNING\]/.test(l)).length;
    return { ok: problems.length === 0, problems, bundle, summary, bundleWarnings, wranglerVersion: readPackageVersion(appDir, 'wrangler') };
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Phase 4 building blocks (nothing here is wired to a command that deploys)
// ---------------------------------------------------------------------------------------------------------------

/**
 * The exact argument list of the future production deploy of an EXTRACTED, VERIFIED artifact. It is a pure function:
 * no CLI command and no workflow calls it yet. Pinned by tests so the command shape is reviewed before it is wired.
 *
 *  - `--config wrangler.jsonc` (with OPEN_NEXT_DEPLOY=true in the environment) stops wrangler delegating to
 *    `opennextjs-cloudflare deploy`; neither it nor `pnpm deploy` is used because both can rebuild.
 *  - `--keep-vars` so a dashboard-defined plaintext variable is never silently deleted.
 *  - No --var, --secrets-file, --name, --routes, --domains or --env: everything else comes from the verified
 *    wrangler.jsonc inside the artifact.
 */
export function deployArgs(wranglerBin, { sha, runUrl }) {
  if (!FULL_SHA.test(sha ?? '')) throw new ArtifactError([problem('bad-sha', 'the deployed commit must be a full 40-character lowercase SHA')]);
  if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/actions\/runs\/\d+(\/attempts\/\d+)?$/.test(runUrl ?? '')) {
    throw new ArtifactError([problem('bad-run-url', 'runUrl must be a GitHub Actions run URL')]);
  }
  return [wranglerBin, 'deploy', '--config', 'wrangler.jsonc', '--keep-vars', '--tag', `sha-${sha.slice(0, 12)}`, '--message', `${runUrl} ${sha}`];
}

/** Placeholder values only: they let the Worker start in local workerd, nothing here is a credential. */
export const LOCAL_DEV_VARS = {
  web: { POSTGRES_URL: 'postgres://smoke:smoke@127.0.0.1:5432/smoke' },
  admin: { POSTGRES_URL: 'postgres://smoke:smoke@127.0.0.1:5432/smoke', AUTH_SECRET: 'local-smoke-placeholder', AUTH_GITHUB_ID: 'local-smoke', AUTH_GITHUB_SECRET: 'local-smoke' },
  student: { POSTGRES_URL: 'postgres://smoke:smoke@127.0.0.1:5432/smoke', AUTH_SECRET: 'local-smoke-placeholder' }
};

export function localDevArgs(wranglerBin, app, port) {
  if (!LOCAL_DEV_VARS[app]) throw new ArtifactError([problem('bad-app', `unknown app "${app}"`)]);
  const vars = Object.entries(LOCAL_DEV_VARS[app]).flatMap(([k, v]) => ['--var', `${k}:${v}`]);
  return [wranglerBin, 'dev', '--local', '--ip', '127.0.0.1', '--port', String(port), '--config', 'wrangler.jsonc', ...vars];
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function killTree(child) {
  if (!child.pid || child.exitCode !== null) return;
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(-child.pid, 'SIGKILL');
  } catch {
    /* already gone */
  }
}

/**
 * Credential-free runtime proof: run the extracted artifact in local workerd and smoke-test it over loopback.
 * Proves the bundle starts and routes; it does not touch Cloudflare, a database or any production secret.
 */
export async function localSmoke({ app, repoRoot, appDir = path.join(repoRoot, 'apps', app), env = process.env, startupTimeoutMs = 180_000, runner = runSmoke }) {
  const present = credentialEnvNames(env);
  if (present.length) throw new ArtifactError([problem('credentials-present', `refusing to run: Cloudflare/Wrangler variables are set (${present.join(', ')}). The local smoke must be credential-free.`)]);
  const req = createRequire(path.join(appDir, 'package.json'));
  const wranglerBin = path.join(path.dirname(req.resolve('wrangler/package.json')), 'bin', 'wrangler.js');
  const port = await freePort();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'wrangler-dev-home-'));
  const childEnv = { ...env, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, '.config'), APPDATA: path.join(home, 'AppData'), WRANGLER_SEND_METRICS: 'false', WRANGLER_HIDE_BANNER: 'true', CI: 'true' };
  const child = spawn(process.execPath, localDevArgs(wranglerBin, app, port), { cwd: appDir, env: childEnv, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  const keep = (chunk) => {
    log = (log + chunk.toString()).slice(-20_000);
  };
  child.stdout.on('data', keep);
  child.stderr.on('data', keep);
  let exited = false;
  child.on('exit', () => {
    exited = true;
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    const deadline = Date.now() + startupTimeoutMs;
    let up = false;
    while (Date.now() < deadline && !exited && !up) {
      up = await fetch(`${baseUrl}/`, { redirect: 'manual', signal: AbortSignal.timeout(3000) }).then(() => true, () => false);
      if (!up) await new Promise((r) => setTimeout(r, 1000));
    }
    if (!up) return { ok: false, problems: [problem('local-dev-not-ready', exited ? 'wrangler dev exited before serving' : 'wrangler dev did not start in time')], log: log.slice(-2000) };
    const smoke = await runner({ app, baseUrl, attempts: 5, delayMs: 2000 });
    return { ok: smoke.ok, problems: smoke.ok ? [] : smoke.results.filter((r) => !r.ok).map((r) => problem('smoke-failed', `${r.path}: ${r.problem}`)), smoke, wranglerVersion: readPackageVersion(appDir, 'wrangler'), log: smoke.ok ? '' : log.slice(-2000) };
  } finally {
    killTree(child);
    fs.rmSync(home, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------------------------

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i++) {
    if (!rest[i].startsWith('--')) throw new Error(`unexpected argument ${rest[i]}`);
    opts[rest[i].slice(2)] = rest[i + 1]?.startsWith('--') || rest[i + 1] === undefined ? 'true' : rest[++i];
  }
  return { command, opts };
}

function appendSummary(markdown) {
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}

const annotate = (problems) => {
  for (const p of problems) process.stdout.write(`::error title=${p.code}::${String(p.message).replace(/\r?\n/g, ' ')}\n`);
};

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

async function main() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const { command, opts } = parseArgs(process.argv.slice(2));
  const app = opts.app;
  if (!APPS.includes(app)) throw new Error(`--app must be one of ${APPS.join(', ')}`);
  const print = (o) => process.stdout.write(`${JSON.stringify(o, null, 2)}\n`);

  if (command === 'package') {
    const m = await packageArtifact({ app, repoRoot, outDir: path.resolve(opts.out) });
    // The manifest digest is the independent trust anchor: publish it through a job output, NOT through the artifact.
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `digest=${app}:${m.manifestSha256}\n`);
    print({ app, sha: m.source.sha, manifestSha256: m.manifestSha256, archive: m.artifact, counts: m.inventory.counts, totalBytes: m.inventory.totalBytes, symlinks: m.symlinks.length, tools: m.tools });
    appendSummary(`### ${app}: packaged\n- archive \`${m.artifact.file}\` ${mb(m.artifact.bytes)}, sha256 \`${m.artifact.sha256}\`\n- ${m.inventory.counts.files} files, ${m.inventory.counts.symlinks} symlinks (${m.symlinks.filter((s) => s.absolute).length} absolute), ${m.inventory.counts.directories} directories, ${mb(m.inventory.totalBytes)} uncompressed\n- manifest sha256 (independent anchor, published as a job output) \`${m.manifestSha256}\`\n- source \`${m.source.sha}\`, run \`${m.source.runId}\`, lockfile \`${m.lockfileSha256.slice(0, 12)}\`\n- tools: ${Object.entries(m.tools).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  } else if (command === 'verify') {
    // Fail closed by default: all three independent expectations are required unless explicitly waived (local use only).
    const strict = opts['allow-missing-expectations'] !== 'true';
    let manifestSha256;
    if (opts['expect-manifest-sha256'] !== undefined || strict) {
      const parsed = parseExpectedDigest(app, opts['expect-manifest-sha256']);
      if (parsed.problem) {
        print({ ok: false, problems: [parsed.problem] });
        annotate([parsed.problem]);
        process.exitCode = 1;
        return;
      }
      manifestSha256 = parsed.manifestSha256;
    }
    const result = await verifyArtifact({ app, repoRoot, dir: path.resolve(opts.dir), expect: { strict, sha: opts['expect-sha'], runId: opts['expect-run-id'], manifestSha256 } });
    print(result.ok ? result.report : { ok: false, problems: result.problems });
    if (!result.ok) annotate(result.problems);
    appendSummary(result.ok ? `### ${app}: verified\n- sha256 \`${result.report.archiveSha256}\` matches\n- ${result.report.symlinks.resolved}/${result.report.symlinks.total} symlinks resolve (${result.report.symlinks.absolute} absolute)\n- extracted tree matches the inventory exactly` : `### ${app}: VERIFICATION FAILED\n${result.problems.map((p) => `- \`${p.code}\` ${p.message}`).join('\n')}`);
    if (!result.ok) process.exitCode = 1;
  } else if (command === 'negative-tests') {
    const result = await runNegativeTests({ app, repoRoot, dir: path.resolve(opts.dir) });
    print(result);
    if (!result.ok) annotate(result.results.filter((r) => !r.detected).map((r) => problem('negative-test-failed', `${r.name}: expected ${r.expectedFailure}, got ${JSON.stringify(r.codes)}`)));
    appendSummary(`### ${app}: negative tests ${result.ok ? 'all failed as required' : 'UNEXPECTED RESULT'}\n${result.results.map((r) => `- ${r.detected ? 'PASS' : 'FAIL'} ${r.name}${r.expectedFailure ? ` (expects \`${r.expectedFailure}\`)` : ''} ${r.note}`).join('\n')}`);
    if (!result.ok) process.exitCode = 1;
  } else if (command === 'dry-run') {
    const result = dryRunDeploy({ app, repoRoot, outDir: path.resolve(opts.out) });
    print(result);
    if (!result.ok) annotate(result.problems);
    appendSummary(`### ${app}: wrangler --dry-run ${result.ok ? 'ok' : 'FAILED'}\n- wrangler ${result.wranglerVersion}; bundle files: ${result.bundle.join(', ')}\n- no credentials in the environment; nothing was deployed`);
    if (!result.ok) process.exitCode = 1;
  } else if (command === 'local-smoke') {
    const result = await localSmoke({ app, repoRoot });
    print(result);
    if (!result.ok) annotate(result.problems);
    appendSummary(`### ${app}: local workerd smoke ${result.ok ? 'passed' : 'FAILED'}
- ran the extracted artifact with wrangler dev --local on 127.0.0.1; no credentials, placeholder variables only`);
    if (!result.ok) process.exitCode = 1;
  } else throw new Error(`unknown command "${command}" (package | verify | negative-tests | dry-run | local-smoke)`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((err) => {
    process.stderr.write(`::error::${err.problems ? err.message : err.stack}\n`);
    process.exit(1);
  });
}
