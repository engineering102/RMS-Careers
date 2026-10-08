import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { drizzle } from 'drizzle-orm/neon-http';

vi.mock('server-only', () => ({}));

// No database or network is touched: the neon-http client is built over a stub SQL function.
describe('neon-http transaction guard', () => {
  it('rejects db.transaction() on the neon-http driver (why @rms/db/tx exists)', async () => {
    const stubSql = Object.assign(async () => ({ rows: [], fields: [] }), {
      transaction: async () => []
    });
    const httpDb = drizzle(stubSql as never);
    await expect(httpDb.transaction(async () => 1)).rejects.toThrow(
      'No transactions support in neon-http driver'
    );
  });
});

describe('@rms/db/tx lazy per-transaction client', () => {
  const clientInstances: Array<{
    connect: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
  }> = [];
  const behavior = {
    connectError: null as Error | null,
    endError: null as Error | null,
    txImpl: async (cb: (tx: unknown) => Promise<unknown>) => cb({})
  };
  let savedUrl: string | undefined;

  async function loadTx() {
    vi.resetModules();
    clientInstances.length = 0;
    vi.doMock('@neondatabase/serverless', () => ({
      Client: class {
        connect = vi.fn(async () => {
          if (behavior.connectError) throw behavior.connectError;
        });
        end = vi.fn(async () => {
          if (behavior.endError) throw behavior.endError;
        });
        on = vi.fn();
        constructor() {
          clientInstances.push(this);
        }
      }
    }));
    vi.doMock('drizzle-orm/neon-serverless', () => ({
      drizzle: () => ({ transaction: (cb: never) => behavior.txImpl(cb) })
    }));
    return (await import('@rms/db/tx')).dbTx;
  }

  beforeEach(() => {
    savedUrl = process.env.POSTGRES_URL;
    process.env.POSTGRES_URL = 'postgres://user:secret@example.invalid/db';
    behavior.connectError = null;
    behavior.endError = null;
    behavior.txImpl = async (cb) => cb({});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (savedUrl === undefined) delete process.env.POSTGRES_URL;
    else process.env.POSTGRES_URL = savedUrl;
    vi.doUnmock('@neondatabase/serverless');
    vi.doUnmock('drizzle-orm/neon-serverless');
    vi.restoreAllMocks();
  });

  it('importing does not require POSTGRES_URL or create a client', async () => {
    delete process.env.POSTGRES_URL;
    const dbTx = await loadTx();
    expect(dbTx).toBeDefined();
    expect(clientInstances).toHaveLength(0);
  });

  it('fails clearly without POSTGRES_URL and creates no client', async () => {
    const dbTx = await loadTx();
    delete process.env.POSTGRES_URL;
    await expect(dbTx.transaction(async () => 1)).rejects.toThrow('POSTGRES_URL is not set');
    expect(clientInstances).toHaveLength(0);
  });

  it('creates a fresh client per transaction and ends it on success', async () => {
    const dbTx = await loadTx();
    expect(clientInstances).toHaveLength(0);
    await expect(dbTx.transaction(async () => 'ok')).resolves.toBe('ok');
    await dbTx.transaction(async () => 'again');
    expect(clientInstances).toHaveLength(2);
    for (const c of clientInstances) {
      expect(c.connect).toHaveBeenCalledTimes(1);
      expect(c.end).toHaveBeenCalledTimes(1);
    }
  });

  it('ends the client when the callback fails and preserves the error', async () => {
    const dbTx = await loadTx();
    const boom = new Error('callback failed');
    behavior.txImpl = async () => {
      throw boom;
    };
    await expect(dbTx.transaction(async () => 1)).rejects.toBe(boom);
    expect(clientInstances[0].end).toHaveBeenCalledTimes(1);
  });

  it('ends the client when BEGIN (inside drizzle transaction) fails', async () => {
    const dbTx = await loadTx();
    const beginError = new Error('begin failed');
    behavior.txImpl = async () => {
      throw beginError;
    };
    await expect(dbTx.transaction(async () => 1)).rejects.toBe(beginError);
    expect(clientInstances[0].end).toHaveBeenCalledTimes(1);
  });

  it('ends the client when connect fails', async () => {
    const dbTx = await loadTx();
    const connectError = new Error('connect failed');
    behavior.connectError = connectError;
    await expect(dbTx.transaction(async () => 1)).rejects.toBe(connectError);
    expect(clientInstances[0].end).toHaveBeenCalledTimes(1);
  });

  it('does not let a cleanup failure hide the original error, nor log the URL', async () => {
    const dbTx = await loadTx();
    const original = new Error('original failure');
    behavior.txImpl = async () => {
      throw original;
    };
    behavior.endError = new Error('end failed');
    await expect(dbTx.transaction(async () => 1)).rejects.toBe(original);
    const logged = JSON.stringify((console.error as ReturnType<typeof vi.fn>).mock.calls);
    expect(logged).toContain('end failed');
    expect(logged).not.toContain('secret');
  });

  it('rejects unsupported non-transaction access', async () => {
    const dbTx = await loadTx();
    expect(() => (dbTx as unknown as { select: unknown }).select).toThrow('only supports transaction()');
  });
});

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const SKIP_DIRS = new Set(['node_modules', '.next', '.open-next', '__tests__', 'scripts']);

function listSourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) listSourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts')) out.push(full);
  }
  return out;
}

describe('transaction usage conventions', () => {
  const files = [
    ...listSourceFiles(join(REPO_ROOT, 'apps', 'student')),
    ...listSourceFiles(join(REPO_ROOT, 'apps', 'admin'))
  ];

  it('never calls .transaction() on the root neon-http db', () => {
    const offenders = files.filter((f) => /\bdb\.transaction\(/.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => relative(REPO_ROOT, f))).toEqual([]);
  });

  it('never silently falls back when the driver rejects transactions', () => {
    const offenders = files.filter((f) =>
      readFileSync(f, 'utf8').includes('No transactions support')
    );
    expect(offenders.map((f) => relative(REPO_ROOT, f))).toEqual([]);
  });

  it('keeps @rms/db/tx out of apps/web', () => {
    const webFiles = listSourceFiles(join(REPO_ROOT, 'apps', 'web'));
    const offenders = webFiles.filter((f) => readFileSync(f, 'utf8').includes('@rms/db/tx'));
    expect(offenders.map((f) => relative(REPO_ROOT, f))).toEqual([]);
  });
});
