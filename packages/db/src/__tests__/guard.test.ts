import { describe, it, expect, vi } from 'vitest';
import {
  DatabaseGuardError,
  assertDatabaseAllowed,
  assertVitestConnectionSafe,
  classifyDatabaseUrl,
  parseDatabaseUrl
} from '../guard';
import { prepareSeedTarget, resolveTestDatabaseUrl, collectAmbientDatabaseUrls } from '../guard-env';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

vi.mock('server-only', () => ({}));

// All URLs below are fabricated. The real production database is never read or contacted.
// They mirror the real layout: test and production are BOTH called "neondb", in different Neon projects.
const TEST_URL = 'postgresql://u:p@ep-test-aaa-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';
const TEST_PIN = 'ep-test-aaa';
const PIN = { expectedTestEndpoint: TEST_PIN };
const DEV_URL = 'postgresql://u:p@ep-dev-bbb.us-east-2.aws.neon.tech/rms_dev';
const PROD_URL = 'postgresql://u:p@ep-prod-ccc-pooler.ap-south-1.aws.neon.tech/neondb?sslmode=require';
const PROD_NAMED_URL = 'postgresql://u:p@ep-zzz.us-east-2.aws.neon.tech/rms_prod';
const EXTERNAL_URL = 'postgresql://u:p@db.example.com:5432/neondb';

function tmpRoot(files: Record<string, string> = {}): string {
  const root = mkdtempSync(path.join(tmpdir(), 'rms-guard-'));
  writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages: []\n');
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), content);
  }
  return root;
}

describe('classification', () => {
  it('1. the pinned test endpoint -> allowed for test operations', () => {
    expect(classifyDatabaseUrl(TEST_URL, PIN).classification).toBe('test');
    for (const op of ['test-run', 'test-seed', 'test-reset', 'test-cleanup'] as const) {
      expect(() => assertDatabaseAllowed(TEST_URL, op, PIN)).not.toThrow();
    }
  });

  it('12. the name "neondb" alone never makes a database trusted', () => {
    // Same database name as TEST_URL, different endpoint: not trusted.
    expect(classifyDatabaseUrl(PROD_URL, PIN).classification).toBe('unknown');
    expect(() => assertDatabaseAllowed(PROD_URL, 'test-run', PIN)).toThrow(/unknown/);
    // Even the genuine test URL is untrusted when no endpoint pin is configured.
    expect(classifyDatabaseUrl(TEST_URL).classification).toBe('unknown');
    expect(() => assertDatabaseAllowed(TEST_URL, 'test-run')).toThrow(/unknown/);
  });

  it('4/8. production database -> rejected for every operation, including destructive ones', () => {
    expect(classifyDatabaseUrl(PROD_NAMED_URL, PIN).classification).toBe('production');
    for (const op of ['test-run', 'test-seed', 'test-reset', 'test-cleanup', 'dev-seed'] as const) {
      expect(() => assertDatabaseAllowed(PROD_NAMED_URL, op, PIN)).toThrow(DatabaseGuardError);
      expect(() => assertDatabaseAllowed(PROD_URL, op, PIN)).toThrow(DatabaseGuardError);
    }
  });

  it('production wins even if the pin is (mis)set to the production endpoint', () => {
    const ambient = { expectedTestEndpoint: 'ep-prod-ccc', ambientUrls: [PROD_URL] };
    expect(classifyDatabaseUrl(PROD_URL, ambient).classification).toBe('production');
    const listed = { expectedTestEndpoint: 'ep-prod-ccc', productionHosts: ['ep-prod-ccc.ap-south-1.aws.neon.tech'] };
    expect(classifyDatabaseUrl(PROD_URL, listed).classification).toBe('production');
    expect(() => assertDatabaseAllowed(PROD_URL, 'test-reset', listed)).toThrow(/production/);
  });

  it('7. arbitrary external PostgreSQL URLs are rejected, even if the pin names their host', () => {
    expect(() => assertDatabaseAllowed(EXTERNAL_URL, 'test-run', PIN)).toThrow(/unknown/);
    expect(() => assertDatabaseAllowed(EXTERNAL_URL, 'test-run', { expectedTestEndpoint: 'db' })).toThrow(/unknown/);
  });

  it('2/3. missing or malformed URLs -> rejected', () => {
    for (const bad of [undefined, null, '', '   ']) {
      expect(() => assertDatabaseAllowed(bad, 'test-run', PIN)).toThrow(/missing/);
    }
    for (const bad of ['not a url', 'mysql://u:p@h/neondb', 'postgres://host-without-db']) {
      expect(() => assertDatabaseAllowed(bad, 'test-run', PIN)).toThrow(/invalid/);
    }
  });

  it('a test URL on the same endpoint as an ambient application URL is production', () => {
    const sameEndpointAppUrl = 'postgresql://u:p@ep-test-aaa.us-east-2.aws.neon.tech/neondb';
    const ctx = { ...PIN, ambientUrls: [sameEndpointAppUrl] };
    expect(classifyDatabaseUrl(TEST_URL, ctx).classification).toBe('production');
    expect(() => assertDatabaseAllowed(TEST_URL, 'test-run', ctx)).toThrow(DatabaseGuardError);
  });

  it('a development database is rejected for test operations and vice versa', () => {
    expect(() => assertDatabaseAllowed(DEV_URL, 'test-reset', PIN)).toThrow(/development/);
    expect(() => assertDatabaseAllowed(TEST_URL, 'dev-seed', PIN)).toThrow(/"test"/);
    expect(() => assertDatabaseAllowed(DEV_URL, 'dev-seed')).not.toThrow();
  });

  it('never leaks credentials or the connection string in errors', () => {
    let message = '';
    try {
      assertDatabaseAllowed(PROD_URL, 'test-reset', PIN);
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain('unknown');
    expect(message).not.toContain('u:p');
    expect(message).not.toContain('neon.tech');
    expect(message).not.toContain('ep-prod');
    expect(parseDatabaseUrl(TEST_URL)).toMatchObject({ endpoint: 'ep-test-aaa', database: 'neondb' });
  });
});

describe('8. destructive operation against production', () => {
  it('test-reset and test-cleanup reject production and unknown targets', () => {
    for (const url of [PROD_URL, PROD_NAMED_URL, EXTERNAL_URL]) {
      expect(() => assertDatabaseAllowed(url, 'test-reset', PIN)).toThrow(DatabaseGuardError);
      expect(() => assertDatabaseAllowed(url, 'test-cleanup', PIN)).toThrow(DatabaseGuardError);
    }
  });
});

describe('9. seed against production', () => {
  const noDevLoad = () => {};

  it('refuses when no explicit target is named (no default)', () => {
    expect(() =>
      prepareSeedTarget({ argv: [], env: { POSTGRES_URL: DEV_URL }, loadDevelopmentEnv: noDevLoad })
    ).toThrow(/seed target is required/);
  });

  it('refuses --target=production', () => {
    expect(() =>
      prepareSeedTarget({ argv: ['--target=production'], env: { POSTGRES_URL: PROD_URL }, loadDevelopmentEnv: noDevLoad })
    ).toThrow(/Seeding production is not supported/);
  });

  it('--target=development rejects a production/unknown/missing POSTGRES_URL (what .env.local holds today)', () => {
    for (const url of [PROD_URL, PROD_NAMED_URL, undefined]) {
      expect(() =>
        prepareSeedTarget({ argv: ['--target=development'], env: { POSTGRES_URL: url }, loadDevelopmentEnv: noDevLoad })
      ).toThrow(DatabaseGuardError);
    }
  });

  it('--target=development accepts a rms_dev database and leaves POSTGRES_URL pointing at it', () => {
    const env: Record<string, string | undefined> = { POSTGRES_URL: DEV_URL };
    const result = prepareSeedTarget({ argv: ['--target=development'], env, loadDevelopmentEnv: noDevLoad });
    expect(result.target).toBe('development');
    expect(env.POSTGRES_URL).toBe(DEV_URL);
  });

  it('--target=test refuses a production URL placed in TEST_DATABASE_URL', () => {
    const env = { TEST_DATABASE_URL: PROD_URL, TEST_DATABASE_ENDPOINT: TEST_PIN };
    expect(() =>
      prepareSeedTarget({ argv: ['--target=test'], env, root: tmpRoot(), loadDevelopmentEnv: noDevLoad })
    ).toThrow(/unknown/);
  });

  it('--target=test does not fall back to POSTGRES_URL: it needs TEST_DATABASE_URL', () => {
    expect(() =>
      prepareSeedTarget({
        argv: ['--target=test'],
        env: { POSTGRES_URL: TEST_URL, TEST_DATABASE_ENDPOINT: TEST_PIN },
        root: tmpRoot(),
        loadDevelopmentEnv: noDevLoad
      })
    ).toThrow(/missing/);
  });

  it('--target=test with a valid, pinned TEST_DATABASE_URL points POSTGRES_URL at it, in-process only', () => {
    const env: Record<string, string | undefined> = {
      TEST_DATABASE_URL: TEST_URL,
      TEST_DATABASE_ENDPOINT: TEST_PIN,
      POSTGRES_URL: PROD_URL
    };
    const result = prepareSeedTarget({ argv: ['--target=test'], env, root: tmpRoot(), loadDevelopmentEnv: noDevLoad });
    expect(result.target).toBe('test');
    expect(env.POSTGRES_URL).toBe(TEST_URL);
  });
});

describe('tests do not fall back to .env.local / POSTGRES_URL', () => {
  const pinned = { TEST_DATABASE_ENDPOINT: TEST_PIN };

  it('5. a URL that exists only in POSTGRES_URL or .env.local is never the test target', () => {
    const root = tmpRoot({
      '.env.local': `POSTGRES_URL=${TEST_URL}\n`,
      'apps/admin/.env.local': `POSTGRES_URL=${PROD_URL}\nTEST_DATABASE_URL=${PROD_URL}\nTEST_DATABASE_ENDPOINT=${TEST_PIN}\n`
    });
    expect(() => resolveTestDatabaseUrl({ ...pinned, POSTGRES_URL: TEST_URL }, root)).toThrow(/missing/);
  });

  it('6. .env.local cannot override TEST_DATABASE_URL or its endpoint pin', () => {
    const root = tmpRoot({
      '.env.test.local': `TEST_DATABASE_URL=${TEST_URL}\nTEST_DATABASE_ENDPOINT=${TEST_PIN}\n`,
      'apps/admin/.env.local': `TEST_DATABASE_URL=${PROD_URL}\nTEST_DATABASE_ENDPOINT=ep-prod-ccc\n`,
      '.env.local': `TEST_DATABASE_URL=${PROD_URL}\n`
    });
    expect(resolveTestDatabaseUrl({}, root)).toBe(TEST_URL);
  });

  it('3. a malformed TEST_DATABASE_URL is rejected', () => {
    for (const bad of ['garbage', 'http://example.com/x', 'postgres://']) {
      expect(() => resolveTestDatabaseUrl({ TEST_DATABASE_URL: bad, ...pinned }, tmpRoot())).toThrow(
        DatabaseGuardError
      );
    }
  });

  it('2. a missing TEST_DATABASE_URL or a missing endpoint pin is rejected', () => {
    expect(() => resolveTestDatabaseUrl({ ...pinned }, tmpRoot())).toThrow(/missing/);
    expect(() => resolveTestDatabaseUrl({ TEST_DATABASE_URL: TEST_URL }, tmpRoot())).toThrow(/unknown/);
  });

  it('1. a valid TEST_DATABASE_URL with its pin is accepted', () => {
    expect(resolveTestDatabaseUrl({ TEST_DATABASE_URL: TEST_URL, ...pinned }, tmpRoot())).toBe(TEST_URL);
  });

  it('a test URL on the same endpoint as one found in a local env file is rejected', () => {
    const root = tmpRoot({
      'apps/admin/.env.local': 'POSTGRES_URL=postgresql://u:p@ep-test-aaa.us-east-2.aws.neon.tech/neondb\n'
    });
    expect(() => resolveTestDatabaseUrl({ TEST_DATABASE_URL: TEST_URL, ...pinned }, root)).toThrow(/production/);
  });

  it('a URL that is BOTH TEST_DATABASE_URL and POSTGRES_URL/DATABASE_URL is treated as production', () => {
    const env = { TEST_DATABASE_URL: PROD_URL, TEST_DATABASE_ENDPOINT: 'ep-prod-ccc' };
    expect(() => resolveTestDatabaseUrl({ ...env, POSTGRES_URL: PROD_URL }, tmpRoot())).toThrow(/production/);
    expect(() => resolveTestDatabaseUrl({ ...env, DATABASE_URL: PROD_URL }, tmpRoot())).toThrow(/production/);
    const root = tmpRoot({ 'apps/admin/.env.local': `POSTGRES_URL=${PROD_URL}
` });
    expect(() => resolveTestDatabaseUrl(env, root)).toThrow(/production/);
  });

  it('.env.local files are only scanned for collisions, never loaded', () => {
    const root = tmpRoot({ 'apps/admin/.env.local': `POSTGRES_URL=${DEV_URL}\n` });
    expect(collectAmbientDatabaseUrls({}, root)).toContain(DEV_URL);
  });
});

describe('Vitest runtime connection choke point', () => {
  const vitestEnv = { VITEST: 'true' } as Record<string, string | undefined>;
  const sanctioned = { ...vitestEnv, TEST_DATABASE_URL: TEST_URL, TEST_DATABASE_ENDPOINT: TEST_PIN };

  it('allows local/reserved mock hosts', () => {
    for (const url of [
      'postgres://mock:mock@localhost:5432/mock',
      'postgres://u:s@example.invalid/db',
      'postgres://test/db'
    ]) {
      expect(() => assertVitestConnectionSafe(url, vitestEnv)).not.toThrow();
    }
  });

  it('7. rejects unparseable, external and production URLs, including POSTGRES_URL exported in the shell', () => {
    expect(() => assertVitestConnectionSafe('postgres://test', vitestEnv)).toThrow(DatabaseGuardError);
    for (const url of [PROD_URL, TEST_URL, EXTERNAL_URL]) {
      expect(() => assertVitestConnectionSafe(url, vitestEnv)).toThrow(DatabaseGuardError);
      expect(() => assertVitestConnectionSafe(url, { ...vitestEnv, POSTGRES_URL: url })).toThrow(DatabaseGuardError);
    }
  });

  it('allows a real host only when it is exactly the validated, pinned TEST_DATABASE_URL', () => {
    expect(() => assertVitestConnectionSafe(TEST_URL, sanctioned)).not.toThrow();
    expect(() => assertVitestConnectionSafe(PROD_URL, sanctioned)).toThrow();
    expect(() => assertVitestConnectionSafe(EXTERNAL_URL, sanctioned)).toThrow();
    // production configured as the URL under test with a pin that does not match it
    expect(() =>
      assertVitestConnectionSafe(PROD_URL, { ...vitestEnv, TEST_DATABASE_URL: PROD_URL, TEST_DATABASE_ENDPOINT: TEST_PIN })
    ).toThrow();
    // no pin -> nothing real is allowed
    expect(() => assertVitestConnectionSafe(TEST_URL, { ...vitestEnv, TEST_DATABASE_URL: TEST_URL })).toThrow();
  });

  it('is inactive outside Vitest (application runtime is unaffected)', () => {
    expect(() => assertVitestConnectionSafe(PROD_URL, {})).not.toThrow();
  });

  it('is wired into the real db clients: a real URL under Vitest throws on import / transaction', async () => {
    const saved = process.env.POSTGRES_URL;
    process.env.POSTGRES_URL = PROD_URL;
    vi.resetModules();
    try {
      // resetModules re-evaluates guard.ts, so match on the message rather than the class identity
      await expect(import('../index')).rejects.toThrow(/db-guard/);
      const { dbTx } = await import('../tx');
      await expect(dbTx.transaction(async () => 1)).rejects.toThrow(/db-guard/);
    } finally {
      if (saved === undefined) delete process.env.POSTGRES_URL;
      else process.env.POSTGRES_URL = saved;
    }
  });
});

describe('10. unit tier setup', () => {
  it('stripped every database credential before tests started', () => {
    expect(process.env.RMS_TEST_TIER).toBe('unit');
    expect(process.env.POSTGRES_URL).toBeUndefined();
    expect(process.env.DATABASE_URL).toBeUndefined();
    expect(process.env.TEST_DATABASE_URL).toBeUndefined();
    expect(process.env.TEST_DATABASE_ENDPOINT).toBeUndefined();
  });
});
