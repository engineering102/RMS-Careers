import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import {
  APPS,
  deployArgs,
  extractArchive,
  localDevArgs,
  localSmoke,
  parseExpectedDigest,
  symlinkPolicyProblems,
  workerImportProblems,
  credentialEnvNames,
  dryRunArgs,
  dryRunDeploy,
  packageArtifact,
  parseJsonc,
  readTarGz,
  runNegativeTests,
  safeEntryName,
  tarHeader,
  verifyArtifact
} from '../artifact.mjs';

const canSymlink = (() => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'symlink-probe-'));
  try {
    fs.mkdirSync(path.join(d, 't'));
    fs.symlinkSync(path.join(d, 't'), path.join(d, 'l'), 'dir');
    return true;
  } catch {
    return false;
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
})();
const withLinks = { skip: canSymlink ? false : 'cannot create symlinks on this machine' };

const WRANGLER = `{
  // comment
  "name": "rms-web",
  "main": ".open-next/worker.js",
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
  "secrets": { "required": ["POSTGRES_URL"] },
}`;

/** A miniature repo: root/apps/web with an OpenNext-shaped .open-next whose symlinks point into root/node_modules. */
function makeRepo({ absoluteLink = true } = {}) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-fixture-')));
  const put = (rel, content) => {
    const p = path.join(root, ...rel.split('/'));
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  };
  put('pnpm-lock.yaml', 'lockfileVersion: 9\n');
  put('node_modules/.pnpm/dep@1.0.0/node_modules/dep/index.js', 'module.exports = 1;');
  for (const [pkg, version] of [['wrangler', '4.0.0'], ['next', '15.0.0'], ['@opennextjs/cloudflare', '1.0.0']]) {
    put(`apps/web/node_modules/${pkg}/package.json`, JSON.stringify({ name: pkg, version }));
  }
  put('apps/web/package.json', '{"name":"@rms/web"}');
  put('apps/web/open-next.config.ts', 'export default {};');
  put('apps/web/wrangler.jsonc', WRANGLER);
  put('apps/web/.open-next/worker.js', 'export default {};');
  put('apps/web/.open-next/assets/_next/static/a.js', 'console.log(1)');
  put('apps/web/.open-next/.build/open-next.config.edge.mjs', 'export default {};');
  put('apps/web/.open-next/cloudflare/next-env.mjs', 'export const production = {};');
  put(`apps/web/.open-next/server-functions/default/${'deep/'.repeat(30)}long-name-file.js`, 'long path forces a pax header');
  put('apps/web/.open-next/server-functions/default/unicodé.txt', 'non-ascii name');
  fs.mkdirSync(path.join(root, 'apps/web/.open-next/empty-dir'));
  if (canSymlink) {
    const nm = path.join(root, 'apps/web/.open-next/server-functions/default/node_modules');
    fs.mkdirSync(nm, { recursive: true });
    if (absoluteLink) fs.symlinkSync(path.join(root, 'node_modules/.pnpm/dep@1.0.0/node_modules/dep'), path.join(nm, 'dep'), 'dir');
    fs.symlinkSync(path.join('..', 'worker.js'), path.join(root, 'apps/web/.open-next/assets/rel-link.js'), 'file');
  }
  return root;
}

let repo;
let out;
const ENV = { GITHUB_SHA: 'a'.repeat(40), GITHUB_RUN_ID: '42', GITHUB_RUN_ATTEMPT: '1', GITHUB_REPOSITORY: 'o/r' };

before(async () => {
  repo = makeRepo();
  out = path.join(repo, '_out');
  await packageArtifact({ app: 'web', repoRoot: repo, outDir: out, env: ENV });
});
after(() => fs.rmSync(repo, { recursive: true, force: true }));

/** Fresh "verification job": a copy of the repo WITHOUT build output, as after a clean checkout. */
async function cleanAppDir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-verify-'));
  return d;
}

describe('manifest', () => {
  test('records provenance, tool versions, inventory counts and the digest', () => {
    const m = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
    assert.equal(m.source.sha, ENV.GITHUB_SHA);
    assert.equal(m.source.runId, '42');
    assert.equal(m.worker, 'rms-web');
    assert.equal(m.tools.wrangler, '4.0.0');
    assert.equal(m.tools.opennextCloudflare, '1.0.0');
    assert.match(m.lockfileSha256, /^[0-9a-f]{64}$/);
    assert.match(m.artifact.sha256, /^[0-9a-f]{64}$/);
    assert.ok(m.inventory.counts.files >= 8);
    assert.ok(m.inventory.counts.directories >= 5);
    if (canSymlink) {
      assert.equal(m.inventory.counts.symlinks, 2);
      assert.equal(m.symlinks.filter((s) => s.absolute).length, 1);
    }
  });

  test('packaging is deterministic for identical input', async () => {
    const out2 = path.join(repo, '_out2');
    const m2 = await packageArtifact({ app: 'web', repoRoot: repo, outDir: out2, env: ENV });
    const m1 = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
    assert.equal(m2.artifact.sha256, m1.artifact.sha256);
  });
});

describe('verifyArtifact', { ...withLinks }, () => {
  test('genuine artifact verifies and symlinks resolve', async () => {
    const appDir = await cleanAppDir();
    const r = await verifyArtifact({ app: 'web', dir: out, repoRoot: repo, appDir, expect: { sha: ENV.GITHUB_SHA, runId: '42' } });
    assert.deepEqual(r.problems, []);
    assert.equal(r.ok, true);
    assert.equal(r.report.symlinks.resolved, 2);
    // symlinks were extracted as symlinks, not copies
    const link = path.join(appDir, '.open-next/server-functions/default/node_modules/dep');
    assert.ok(fs.lstatSync(link).isSymbolicLink());
    fs.rmSync(appDir, { recursive: true, force: true });
  });

  test('wrong expected commit / run id are rejected', async () => {
    const a = await verifyArtifact({ app: 'web', dir: out, repoRoot: repo, appDir: await cleanAppDir(), expect: { sha: 'b'.repeat(40) } });
    assert.ok(a.problems.some((p) => p.code === 'source-sha-mismatch'));
    const b = await verifyArtifact({ app: 'web', dir: out, repoRoot: repo, appDir: await cleanAppDir(), expect: { runId: '7' } });
    assert.ok(b.problems.some((p) => p.code === 'run-id-mismatch'));
  });

  test('refuses to extract over an existing build (no silent mixing / rebuild)', async () => {
    const appDir = await cleanAppDir();
    fs.mkdirSync(path.join(appDir, '.open-next'));
    const r = await verifyArtifact({ app: 'web', dir: out, repoRoot: repo, appDir });
    assert.ok(r.problems.some((p) => p.code === 'not-clean'));
  });

  test('fails when the lockfile or a tool version differs from the build', async () => {
    const appDir = await cleanAppDir();
    fs.appendFileSync(path.join(repo, 'pnpm-lock.yaml'), '# changed\n');
    try {
      const r = await verifyArtifact({ app: 'web', dir: out, repoRoot: repo, appDir });
      assert.ok(r.problems.some((p) => p.code === 'lockfile-mismatch'));
    } finally {
      fs.writeFileSync(path.join(repo, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
    }
  });

  test('built elsewhere (different repo root) fails: absolute symlinks would dangle', async () => {
    const other = makeRepo();
    try {
      const r = await verifyArtifact({ app: 'web', dir: out, repoRoot: other, appDir: await cleanAppDir() });
      assert.ok(r.problems.some((p) => p.code === 'repo-root-mismatch'));
    } finally {
      fs.rmSync(other, { recursive: true, force: true });
    }
  });

  test('an artifact whose links are all relative verifies at a different repo root (Linux OpenNext layout)', async () => {
    const a = makeRepo({ absoluteLink: false });
    const b = makeRepo({ absoluteLink: false });
    try {
      const dirA = path.join(a, '_out');
      await packageArtifact({ app: 'web', repoRoot: a, outDir: dirA, env: ENV });
      const r = await verifyArtifact({ app: 'web', dir: dirA, repoRoot: b, appDir: await cleanAppDir() });
      assert.deepEqual(r.problems, []);
    } finally {
      fs.rmSync(a, { recursive: true, force: true });
      fs.rmSync(b, { recursive: true, force: true });
    }
  });

  test('negative tests: every tampering is detected', async () => {
    const r = await runNegativeTests({ app: 'web', dir: out, repoRoot: repo });
    for (const x of r.results) assert.equal(x.detected, true, `${x.name}: ${JSON.stringify(x.codes)}`);
    assert.equal(r.ok, true);
    const names = r.results.map((x) => x.name).join('|');
    assert.match(names, /one byte flipped/);
    assert.match(names, /forged artifact/);
    assert.match(names, /symlink target missing \(link re-pointed\)/);
    assert.match(names, /inventory forged/);
    assert.match(names, /manifest edited, archive untouched/);
    assert.match(names, /without independent expectations/);
    assert.match(names, /not in the inventory/);
    assert.equal(r.results.find((x) => /one byte flipped/.test(x.name)).extractedAnything, false, 'a corrupt archive must not be extracted');
  });
});

describe('tar reader safety', () => {
  const gz = (parts) => {
    const file = path.join(os.tmpdir(), `evil-${Math.random().toString(36).slice(2)}.tar.gz`);
    fs.writeFileSync(file, zlib.gzipSync(Buffer.concat([...parts, Buffer.alloc(1024)])));
    return file;
  };
  const file = (name, body = 'x') => [tarHeader({ name, mode: 0o644, size: body.length, type: '0' }), Buffer.from(body), Buffer.alloc((512 - (body.length % 512)) % 512)];
  const run = (f) => readTarGz(f, async (_e, body) => { for await (const _ of body.chunks()); });

  test('round-trips long, unicode and empty-directory entries', async () => {
    const names = [];
    await readTarGz(path.join(out, 'web.open-next.tar.gz'), async (e, body) => {
      names.push(e.name);
      for await (const _ of body.chunks());
    });
    assert.ok(names.some((n) => n.length > 150));
    assert.ok(names.includes('.open-next/server-functions/default/unicodé.txt'));
    assert.ok(names.includes('.open-next/empty-dir'));
  });

  test('rejects traversal, absolute and out-of-layout names', () => {
    for (const bad of ['../x', '/etc/passwd', 'C:/x', '.open-next/../../x', '.open-next//x', 'other/file', '.open-next\\x']) {
      assert.throws(() => safeEntryName(bad), undefined, bad);
    }
    assert.equal(safeEntryName('.open-next/a/'), '.open-next/a');
  });

  test('rejects hard links, devices and a bad checksum', async () => {
    await assert.rejects(run(gz([tarHeader({ name: '.open-next/h', mode: 0o644, size: 0, type: '1', linkname: '.open-next/x' })])), /unsupported tar entry type/);
    await assert.rejects(run(gz([tarHeader({ name: '.open-next/d', mode: 0o644, size: 0, type: '3' })])), /unsupported tar entry type/);
    const h = tarHeader({ name: '.open-next/a', mode: 0o644, size: 0, type: '0' });
    h[0] ^= 0x01;
    await assert.rejects(run(gz([h])), /checksum/);
  });

  test('rejects an entry written through a symlink', withLinks, async () => {
    const f = gz([tarHeader({ name: '.open-next/l', mode: 0o777, size: 0, type: '2', linkname: '/tmp' }), ...file('.open-next/l/evil')]);
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'extract-'));
      await assert.rejects(extractArchive(f, dest), /inside a symlink/);
    fs.rmSync(dest, { recursive: true, force: true });
  });

  test('rejects truncated archives', async () => {
    const f = gz(file('.open-next/a', 'hello'));
    const buf = fs.readFileSync(f);
    fs.writeFileSync(f, buf.subarray(0, buf.length - 12));
    await assert.rejects(run(f));
  });
});

describe('dry run safety', () => {
  test('args always contain --dry-run and never a bare deploy', () => {
    const args = dryRunArgs('wrangler.js', '/tmp/o');
    assert.deepEqual(args.slice(1, 3), ['deploy', '--dry-run']);
    assert.ok(args.includes('--config'));
  });

  test('refuses to run when any Cloudflare/Wrangler variable is set', () => {
    assert.deepEqual(credentialEnvNames({ PATH: 'x', CLOUDFLARE_API_TOKEN: 't', CF_ACCOUNT_ID: 'a', WRANGLER_X: '1', CLOUDFLARE_EMPTY: '' }).sort(), ['CF_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'WRANGLER_X']);
    assert.throws(() => dryRunDeploy({ app: 'web', repoRoot: repo, outDir: path.join(os.tmpdir(), 'x'), env: { CLOUDFLARE_API_TOKEN: 'secret' } }), /credential-free/);
  });
});

describe('misc', () => {
  test('parseJsonc handles comments, strings with // and trailing commas', () => {
    assert.deepEqual(parseJsonc('{ // c\n "a": "http://x", /* b */ "b": [1,], }'), { a: 'http://x', b: [1] });
  });
  test('only the three known apps are accepted', async () => {
    assert.deepEqual(APPS, ['web', 'admin', 'student']);
    await assert.rejects(packageArtifact({ app: 'tutor', repoRoot: repo, outDir: path.join(repo, 'x') }), /unknown app/);
  });
  test('packaging fails closed when a required file is missing', async () => {
    const r = makeRepo();
    try {
      fs.rmSync(path.join(r, 'apps/web/.open-next/worker.js'));
      await assert.rejects(packageArtifact({ app: 'web', repoRoot: r, outDir: path.join(r, '_o'), env: ENV }), /missing-required/);
    } finally {
      fs.rmSync(r, { recursive: true, force: true });
    }
  });
  test('packaging fails closed on a dangling symlink', withLinks, async () => {
    const r = makeRepo();
    try {
      fs.rmSync(path.join(r, 'node_modules/.pnpm/dep@1.0.0'), { recursive: true });
      await assert.rejects(packageArtifact({ app: 'web', repoRoot: r, outDir: path.join(r, '_o'), env: ENV }), /symlink-dangling/);
    } finally {
      fs.rmSync(r, { recursive: true, force: true });
    }
  });
});

describe('hardening', () => {
  const tarGz = (parts) => {
    const file = path.join(os.tmpdir(), 'bound-' + Math.random().toString(36).slice(2) + '.tar.gz');
    fs.writeFileSync(file, zlib.gzipSync(Buffer.concat([...parts, Buffer.alloc(1024)])));
    return file;
  };
  const fileEntry = (name, body) => [tarHeader({ name, mode: 0o644, size: body.length, type: '0' }), Buffer.from(body), Buffer.alloc((512 - (body.length % 512)) % 512)];
  const listed = (...items) => new Map(items.map((e) => [e.path, e]));

  test('extraction is bound to the inventory: an unlisted entry is rejected before it is written', async () => {
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'bound-dest-'));
    const archive = tarGz([...fileEntry('.open-next/a.js', 'ok'), ...fileEntry('.open-next/unlisted.js', 'evil')]);
    const expected = listed({ path: '.open-next/a.js', type: 'file', size: 2 });
    await assert.rejects(extractArchive(archive, dest, expected), /not in the inventory/);
    assert.equal(fs.existsSync(path.join(dest, '.open-next', 'unlisted.js')), false);
    fs.rmSync(dest, { recursive: true, force: true });
  });

  test('extraction rejects a wrong size, a duplicate entry and a missing entry', async () => {
    const dest = () => fs.mkdtempSync(path.join(os.tmpdir(), 'bound-dest-'));
    await assert.rejects(extractArchive(tarGz(fileEntry('.open-next/a.js', 'toolong')), dest(), listed({ path: '.open-next/a.js', type: 'file', size: 2 })), /size differs/);
    await assert.rejects(extractArchive(tarGz([...fileEntry('.open-next/a.js', 'ok'), ...fileEntry('.open-next/a.js', 'ok')]), dest(), listed({ path: '.open-next/a.js', type: 'file', size: 2 })), /duplicate/);
    await assert.rejects(extractArchive(tarGz(fileEntry('.open-next/a.js', 'ok')), dest(), listed({ path: '.open-next/a.js', type: 'file', size: 2 }, { path: '.open-next/b.js', type: 'file', size: 1 })), /missing 1 inventory/);
  });

  test('symlink policy rejects links that leave the app directory and repository', () => {
    const entries = [
      { path: '.open-next/ok', type: 'symlink', target: '../worker.js' },
      { path: '.open-next/up', type: 'symlink', target: '../../../../../../etc' },
      { path: '.open-next/abs', type: 'symlink', target: path.parse(repo).root + 'definitely-elsewhere' }
    ];
    const problems = symlinkPolicyProblems(entries, path.join(repo, 'apps', 'web'), repo);
    assert.deepEqual(problems.map((p) => p.message.split(' -> ')[0].split(': ')[1]).sort(), ['.open-next/abs', '.open-next/up']);
  });

  test('worker.js imports must all exist in the artifact (an incomplete build is refused at packaging)', async () => {
    const r = makeRepo();
    try {
      const worker = path.join(r, 'apps/web/.open-next/worker.js');
      fs.writeFileSync(worker, 'import { x } from "./cloudflare/init.js";' + String.fromCharCode(10) + 'export default { async fetch() { const { handler } = await import("./server-functions/default/handler.mjs"); return handler; } };');
      fs.writeFileSync(path.join(r, 'apps/web/.open-next/cloudflare/init.js'), 'export const x = 1;');
      await assert.rejects(packageArtifact({ app: 'web', repoRoot: r, outDir: path.join(r, '_o'), env: ENV }), /worker-import-missing/);
      fs.writeFileSync(path.join(r, 'apps/web/.open-next/server-functions/default/handler.mjs'), 'export const handler = 1;');
      const m = await packageArtifact({ app: 'web', repoRoot: r, outDir: path.join(r, '_o2'), env: ENV });
      assert.ok(m.inventory.counts.files > 0);
      const entries = [{ path: '.open-next/cloudflare/init.js', type: 'file' }];
      assert.equal(workerImportProblems(path.join(r, 'apps/web'), entries).length, 1);
    } finally {
      fs.rmSync(r, { recursive: true, force: true });
    }
  });

  test('the Worker name must match the app', async () => {
    const r = makeRepo();
    try {
      fs.writeFileSync(path.join(r, 'apps/web/wrangler.jsonc'), WRANGLER.replace('rms-web', 'rms-admin'));
      await assert.rejects(packageArtifact({ app: 'web', repoRoot: r, outDir: path.join(r, '_o'), env: ENV }), /worker-name-mismatch/);
    } finally {
      fs.rmSync(r, { recursive: true, force: true });
    }
  });

  test('strict verification refuses to run without independent expectations', async () => {
    const r = await verifyArtifact({ app: 'web', dir: out, repoRoot: repo, appDir: await cleanAppDir(), expect: { strict: true, sha: ENV.GITHUB_SHA } });
    assert.deepEqual(r.problems.map((p) => p.code), ['missing-expectation', 'missing-expectation']);
  });

  const GOOD = 'a'.repeat(64);

  test('parseExpectedDigest: missing, empty, malformed and cross-application hand-offs fail closed', () => {
    for (const v of [undefined, null, '', '   ']) assert.equal(parseExpectedDigest('web', v).problem.code, 'missing-expectation');
    for (const v of [GOOD, 'web:' + GOOD.slice(1), 'web:' + GOOD.toUpperCase(), 'web:' + GOOD + 'ff', 'web ' + GOOD, 'tutor:' + GOOD, ':' + GOOD, 'web:' + 'g'.repeat(64)]) {
      assert.equal(parseExpectedDigest('web', v).problem.code, 'bad-expectation', v);
    }
    for (const other of ['admin', 'student']) assert.equal(parseExpectedDigest('web', other + ':' + GOOD).problem.code, 'digest-app-mismatch');
    assert.equal(parseExpectedDigest('student', 'web:' + GOOD).problem.code, 'digest-app-mismatch');
    assert.deepEqual(parseExpectedDigest('web', 'web:' + GOOD), { manifestSha256: GOOD });
  });

  test('CLI digest hand-off: missing, malformed, cross-app and mismatched values are rejected before anything is extracted', { skip: canSymlink ? false : 'no symlinks' }, async () => {
    const { spawnSync } = await import('node:child_process');
    const crypto = await import('node:crypto');
    const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'artifact.mjs');
    const real = crypto.createHash('sha256').update(fs.readFileSync(path.join(out, 'manifest.json'))).digest('hex');
    const run = (token) => {
      const args = [cli, 'verify', '--app', 'web', '--dir', out, '--expect-sha', ENV.GITHUB_SHA, '--expect-run-id', '42'];
      if (token !== undefined) args.push('--expect-manifest-sha256', token);
      return spawnSync(process.execPath, args, { encoding: 'utf8' });
    };
    const cases = [
      [undefined, 'missing-expectation'],
      ['', 'missing-expectation'],
      [real, 'bad-expectation'],
      ['web:' + real.toUpperCase(), 'bad-expectation'],
      ['admin:' + real, 'digest-app-mismatch'],
      ['student:' + real, 'digest-app-mismatch'],
      ['web:' + 'f'.repeat(64), 'expected-digest-mismatch']
    ];
    for (const [token, code] of cases) {
      const r = run(token);
      assert.notEqual(r.status, 0, 'token ' + JSON.stringify(token));
      assert.match(r.stdout, new RegExp('::error title=' + code + '::'), 'token ' + JSON.stringify(token) + ' -> ' + r.stdout.slice(0, 300));
    }
    // the correct, correctly labelled digest gets past every hand-off check (it may still fail later checks in this fixture)
    const ok = run('web:' + real);
    assert.doesNotMatch(ok.stdout, /missing-expectation|bad-expectation|digest-app-mismatch|expected-digest-mismatch/);
  });

  test('library: an artifact for another app, or a digest of another artifact, is refused and nothing is extracted', async () => {
    const real = (await import('node:crypto')).createHash('sha256').update(fs.readFileSync(path.join(out, 'manifest.json'))).digest('hex');
    const adminDir = await cleanAppDir();
    const asAdmin = await verifyArtifact({ app: 'admin', dir: out, repoRoot: repo, appDir: adminDir, expect: { manifestSha256: real } });
    assert.ok(asAdmin.problems.some((p) => p.code === 'app-mismatch'));
    assert.ok(asAdmin.problems.some((p) => p.code === 'worker-name-mismatch'));
    assert.deepEqual(fs.readdirSync(adminDir), []);
    const webDir = await cleanAppDir();
    const wrongDigest = await verifyArtifact({ app: 'web', dir: out, repoRoot: repo, appDir: webDir, expect: { manifestSha256: 'f'.repeat(64) } });
    assert.ok(wrongDigest.problems.some((p) => p.code === 'expected-digest-mismatch'));
    assert.deepEqual(fs.readdirSync(webDir), []);
    const emptyDir = await cleanAppDir();
    const missing = await verifyArtifact({ app: 'web', dir: out, repoRoot: repo, appDir: emptyDir, expect: { strict: true, sha: ENV.GITHUB_SHA, runId: '42', manifestSha256: '' } });
    assert.ok(missing.problems.some((p) => p.code === 'missing-expectation'));
    assert.deepEqual(fs.readdirSync(emptyDir), []);
  });

  test('a manifest-controlled archive file name cannot redirect the read', async () => {
    const dir2 = path.join(repo, '_badname');
    fs.cpSync(out, dir2, { recursive: true });
    const m = JSON.parse(fs.readFileSync(path.join(dir2, 'manifest.json'), 'utf8'));
    m.artifact.file = '../../etc/passwd';
    fs.writeFileSync(path.join(dir2, 'manifest.json'), JSON.stringify(m));
    const r = await verifyArtifact({ app: 'web', dir: dir2, repoRoot: repo, appDir: await cleanAppDir() });
    assert.ok(r.problems.some((p) => p.code === 'bad-manifest' && /archive file name/.test(p.message)));
  });
});

describe('phase 4 building blocks (nothing deploys)', () => {
  const SHA = 'a'.repeat(40);
  const RUN = 'https://github.com/engineering102/RMS-Careers/actions/runs/123';

  test('deployArgs: the exact production command shape, no overrides', () => {
    const args = deployArgs('/x/wrangler.js', { sha: SHA, runUrl: RUN });
    assert.deepEqual(args, ['/x/wrangler.js', 'deploy', '--config', 'wrangler.jsonc', '--keep-vars', '--tag', 'sha-aaaaaaaaaaaa', '--message', `${RUN} ${SHA}`]);
    for (const forbidden of ['--var', '--secrets-file', '--name', '--routes', '--route', '--domains', '--env', '--dry-run', '--assets', '--no-bundle']) {
      assert.ok(!args.includes(forbidden), forbidden);
    }
  });

  test('deployArgs rejects a short SHA, an uppercase SHA and a run URL that is not a GitHub Actions run', () => {
    for (const sha of ['abc', SHA.toUpperCase(), SHA + 'f', '']) assert.throws(() => deployArgs('w', { sha, runUrl: RUN }), /full 40/);
    for (const runUrl of ['', 'http://github.com/o/r/actions/runs/1', 'https://evil.example/o/r/actions/runs/1', RUN + '; rm -rf /', 'https://github.com/o/r/actions/runs/x']) {
      assert.throws(() => deployArgs('w', { sha: SHA, runUrl }), /GitHub Actions run/, runUrl);
    }
  });

  test('deployArgs is NOT wired to any command or workflow yet', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
    const files = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === '.git' || e.name === '.next' || e.name === '.open-next') continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(mjs|js|ts|yml|yaml)$/.test(e.name)) files.push(p);
      }
    };
    walk(path.join(root, 'scripts'));
    walk(path.join(root, '.github'));
    const users = files.filter((f) => !/__tests__/.test(f) && /deployArgs\(/.test(fs.readFileSync(f, 'utf8')));
    assert.deepEqual(users.map((f) => path.basename(f)), ['artifact.mjs'], 'only the definition may mention it');
    const src = fs.readFileSync(path.join(root, 'scripts', 'ci', 'artifact.mjs'), 'utf8');
    assert.equal([...src.matchAll(/deployArgs\(/g)].length, 1, 'defined once, called nowhere');
  });

  test('localDevArgs: loopback only, local mode, placeholder variables, never a deploy', () => {
    for (const app of ['web', 'admin', 'student']) {
      const args = localDevArgs('/x/wrangler.js', app, 8791);
      assert.deepEqual(args.slice(0, 8), ['/x/wrangler.js', 'dev', '--local', '--ip', '127.0.0.1', '--port', '8791', '--config']);
      assert.ok(!args.includes('deploy') && !args.includes('--remote'));
      const vars = args.filter((_, i) => args[i - 1] === '--var');
      assert.ok(vars.some((v) => v.startsWith('POSTGRES_URL:postgres://smoke:smoke@127.0.0.1')), app);
      for (const v of vars) assert.match(v, /127\.0\.0\.1|local-smoke/);
    }
    assert.throws(() => localDevArgs('w', 'tutor', 1), /unknown app/);
  });

  test('localSmoke refuses to start when a Cloudflare/Wrangler variable is present', async () => {
    await assert.rejects(localSmoke({ app: 'web', repoRoot: repo, env: { CLOUDFLARE_API_TOKEN: 'x' } }), /credential-free/);
    await assert.rejects(localSmoke({ app: 'web', repoRoot: repo, env: { CF_ACCOUNT_ID: 'x' } }), /credential-free/);
  });
});

describe('SOURCE_SHA binds the artifact to the commit being built', () => {
  const gitRepo = () => {
    const r = makeRepo();
    const git = (...a) => execFileSync('git', a, { cwd: r, encoding: 'utf8' }).trim();
    git('init', '-q', '-b', 'main');
    git('config', 'user.email', 't@example.test');
    git('config', 'user.name', 't');
    git('config', 'commit.gpgsign', 'false');
    fs.writeFileSync(path.join(r, '.gitignore'), '_o*' + String.fromCharCode(10));
    git('add', '.gitignore');
    git('commit', '-q', '-m', 'init');
    return { r, head: git('rev-parse', 'HEAD') };
  };

  test('matching checkout: recorded as the source SHA even if GITHUB_SHA differs (workflow_run case)', async () => {
    const { r, head } = gitRepo();
    try {
      const m = await packageArtifact({ app: 'web', repoRoot: r, outDir: path.join(r, '_o'), env: { ...ENV, GITHUB_SHA: 'f'.repeat(40), SOURCE_SHA: head } });
      assert.equal(m.source.sha, head);
    } finally {
      fs.rmSync(r, { recursive: true, force: true });
    }
  });

  test('mismatching checkout, malformed SHA, and a non-git checkout all fail closed', async () => {
    const { r } = gitRepo();
    try {
      await assert.rejects(packageArtifact({ app: 'web', repoRoot: r, outDir: path.join(r, '_o'), env: { ...ENV, SOURCE_SHA: 'e'.repeat(40) } }), /source-sha-mismatch/);
      await assert.rejects(packageArtifact({ app: 'web', repoRoot: r, outDir: path.join(r, '_o'), env: { ...ENV, SOURCE_SHA: 'HEAD' } }), /source-sha-invalid/);
    } finally {
      fs.rmSync(r, { recursive: true, force: true });
    }
    await assert.rejects(packageArtifact({ app: 'web', repoRoot: repo, outDir: path.join(repo, '_o9'), env: { ...ENV, SOURCE_SHA: 'a'.repeat(40) } }), /not a git checkout/);
  });
});
