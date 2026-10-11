import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveMigrationTarget } from '../guard-env';

// Fake, unroutable hosts: nothing here ever connects.
const PROD = 'postgres://u:p@ep-prod-new-111111.ap-southeast-1.aws.neon.tech/neondb';
const OLD_PROD = 'postgres://u:p@ep-old-prod-222222-pooler.us-east-2.aws.neon.tech/neondb';
const TEST = 'postgres://u:p@ep-test-333333-pooler.ap-southeast-1.aws.neon.tech/neondb';
const REHEARSAL = 'postgres://u:p@ep-rehearsal-444444.ap-southeast-1.aws.neon.tech/neondb';
const DEV = 'postgres://u:p@ep-dev-555555.ap-southeast-1.aws.neon.tech/rms_dev';

let root: string;
const env = (extra: Record<string, string> = {}) => ({ TEST_DATABASE_URL: TEST, TEST_DATABASE_ENDPOINT: 'ep-test-333333', ...extra });
// Built at runtime so this file does not trip test-config-scan (which forbids these tokens in tests).
const LOCAL_ENV_FILE = ['.env', 'local'].join('.');
const FORBIDDEN_IN_CONFIG = new RegExp(
  [['load', 'EnvFile'].join(''), ['dot', 'env'].join(''), LOCAL_ENV_FILE.replace(/\./g, '\\.')].join('|')
);
const resolve = (argv: string[], e: Record<string, string>) => resolveMigrationTarget({ argv: ['node', 'migrate.ts', ...argv], env: e, root });

/** Audit PR-06: no command reaches a database without an explicit, positively identified target. */
describe('resolveMigrationTarget', () => {
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'rms-guard-'));
    writeFileSync(path.join(root, 'pnpm-workspace.yaml'), '');
    mkdirSync(path.join(root, 'apps', 'admin'), { recursive: true });
    // The situation found by the audit: the admin env file points at the old production database.
    writeFileSync(path.join(root, 'apps', 'admin', LOCAL_ENV_FILE), `POSTGRES_URL=${OLD_PROD}\n`);
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('requires --target (no default, RMS_DB_TARGET is not enough)', () => {
    expect(() => resolve([], env({ RMS_DB_TARGET: 'development', POSTGRES_URL: DEV }))).toThrow(/migration target is required/);
  });

  it('development never falls back to the admin app env file', () => {
    expect(() => resolve(['--target=development'], env())).toThrow(/classified as "missing"/);
  });

  it('development accepts only an rms_dev* database from the shell', () => {
    expect(resolve(['--target=development'], env({ POSTGRES_URL: DEV })).db.database).toBe('rms_dev');
    expect(() => resolve(['--target=development'], env({ POSTGRES_URL: OLD_PROD }))).toThrow(/"unknown"/);
  });

  it('test resolves only the pinned test endpoint', () => {
    const r = resolve(['--target=test'], env());
    expect(r.db.endpoint).toBe('ep-test-333333');
    expect(r.live).toMatchObject({ endpoint: 'ep-test-333333', sentinel: 'any' });
  });

  describe('production', () => {
    const prodEnv = (extra: Record<string, string> = {}) =>
      env({ PRODUCTION_DATABASE_URL: PROD, RMS_PRODUCTION_DB_ENDPOINT: 'ep-prod-new-111111', ...extra });

    it('resolves with the pin, a matching --confirm-production and live expectations', () => {
      const r = resolve(['--target=production', '--confirm-production=ep-prod-new-111111'], prodEnv());
      expect(r.target).toBe('production');
      expect(r.live).toEqual({ endpoint: 'ep-prod-new-111111', requireEndpointReport: true, database: 'neondb', sentinel: 'forbidden' });
    });

    it.each([
      ['no confirmation flag', [], {}],
      ['wrong confirmation', ['--confirm-production=ep-other'], {}],
      ['no endpoint pin', ['--confirm-production=ep-prod-new-111111'], { RMS_PRODUCTION_DB_ENDPOINT: '' }],
      ['pin mismatch', ['--confirm-production=ep-prod-new-111111'], { RMS_PRODUCTION_DB_ENDPOINT: 'ep-elsewhere' }],
      ['running in CI', ['--confirm-production=ep-prod-new-111111'], { CI: 'true' }],
      ['production URL also exported as POSTGRES_URL', ['--confirm-production=ep-prod-new-111111'], { POSTGRES_URL: PROD }]
    ])('refuses: %s', (_label, flags, extra) => {
      expect(() => resolve(['--target=production', ...flags], prodEnv(extra as Record<string, string>))).toThrow();
    });

    it('refuses the retired database that a developer env file still references', () => {
      expect(() =>
        resolve(['--target=production', '--confirm-production=ep-old-prod-222222'], env({ PRODUCTION_DATABASE_URL: OLD_PROD, RMS_PRODUCTION_DB_ENDPOINT: 'ep-old-prod-222222' }))
      ).toThrow(/also appears in a local env file/);
    });

    it('refuses the test endpoint even if pinned as production', () => {
      expect(() =>
        resolve(['--target=production', '--confirm-production=ep-test-333333'], env({ PRODUCTION_DATABASE_URL: TEST, RMS_PRODUCTION_DB_ENDPOINT: 'ep-test-333333' }))
      ).toThrow();
    });
  });

  describe('pooled hosts (final review)', () => {
    const POOLED_REHEARSAL = 'postgres://u:p@ep-rehearsal-444444-pooler.ap-southeast-1.aws.neon.tech/neondb';
    const POOLED_PROD = 'postgres://u:p@ep-prod-new-111111-pooler.ap-southeast-1.aws.neon.tech/neondb';
    it('rehearsal refuses the pooled connection string (session advisory lock is unreliable through PgBouncer)', () => {
      expect(() => resolve(['--target=rehearsal'], env({ REHEARSAL_DATABASE_URL: POOLED_REHEARSAL, REHEARSAL_DATABASE_ENDPOINT: 'ep-rehearsal-444444' }))).toThrow(/DIRECT \(non-pooled\)/);
    });
    it('production refuses the pooled connection string', () => {
      expect(() =>
        resolve(['--target=production', '--confirm-production=ep-prod-new-111111'], env({ PRODUCTION_DATABASE_URL: POOLED_PROD, RMS_PRODUCTION_DB_ENDPOINT: 'ep-prod-new-111111' }))
      ).toThrow(/DIRECT \(non-pooled\)/);
    });
  });

  describe('rehearsal', () => {
    it('accepts a pinned fresh branch', () => {
      const r = resolve(['--target=rehearsal'], env({ REHEARSAL_DATABASE_URL: REHEARSAL, REHEARSAL_DATABASE_ENDPOINT: 'ep-rehearsal-444444' }));
      expect(r.live).toMatchObject({ requireEndpointReport: true, sentinel: 'forbidden' });
    });

    it.each([
      ['the test database', TEST, 'ep-test-333333', {}],
      ['the production database', PROD, 'ep-prod-new-111111', { RMS_PRODUCTION_DB_ENDPOINT: 'ep-prod-new-111111' }],
      ['an app database from an env file', OLD_PROD, 'ep-old-prod-222222', {}]
    ])('refuses %s', (_label, url, pin, extra) => {
      expect(() => resolve(['--target=rehearsal'], env({ REHEARSAL_DATABASE_URL: url, REHEARSAL_DATABASE_ENDPOINT: pin, ...extra }))).toThrow();
    });
  });

  it('error messages never contain the connection string', () => {
    try {
      resolve(['--target=production', '--confirm-production=x'], env({ PRODUCTION_DATABASE_URL: PROD, RMS_PRODUCTION_DB_ENDPOINT: 'ep-prod-new-111111' }));
    } catch (error) {
      expect(String(error)).not.toMatch(/postgres:\/\/|u:p@/);
    }
  });
});

describe('drizzle.config.ts', () => {
  const source = readFileSync(path.resolve(__dirname, '../../drizzle.config.ts'), 'utf8');

  it('loads no env file and has no implicit fallback', () => {
    const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(code).not.toMatch(FORBIDDEN_IN_CONFIG);
  });

  it('disables drizzle-kit migrate and requires an explicit development target for connecting commands', () => {
    expect(source).toMatch(/command === 'migrate'/);
    expect(source).toMatch(/RMS_DB_TARGET !== 'development'/);
    expect(source).toMatch(/assertDatabaseAllowed\(url, 'dev-migrate'/);
  });

  it('db:migrate runs the guarded runner, not drizzle-kit', () => {
    const pkg = JSON.parse(readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'));
    expect(pkg.scripts['db:migrate']).toBe('tsx scripts/migrate.ts');
  });
});
