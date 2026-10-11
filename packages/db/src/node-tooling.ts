/**
 * Node-only helpers for operator tooling (migrations, first-admin bootstrap). Never imported by
 * application code. Opens ONE WebSocket connection (session-level advisory locks and multi-statement
 * transactions need a single connection; the neon-http driver cannot provide that).
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Client } from '@neondatabase/serverless';
import type { MigrationFile, SqlExecutor } from './migration-runner';

export interface ClosableExecutor extends SqlExecutor {
  close(): Promise<void>;
}

export async function connectExecutor(connectionString: string): Promise<ClosableExecutor> {
  const client = new Client({ connectionString, connectionTimeoutMillis: 10_000 });
  // Message only: a driver error can carry the connection string.
  client.on('error', (err: Error) => console.error('[db-tooling] connection error:', err.name));
  await client.connect();
  return {
    async query(text, params) {
      const result = await client.query(text, params as unknown[] | undefined);
      return result.rows as Array<Record<string, unknown>>;
    },
    async close() {
      await client.end().catch(() => undefined);
    }
  };
}

export const sha256Hex = (text: string): string => createHash('sha256').update(text).digest('hex');

/** Migration files in journal order (packages/db/drizzle/meta/_journal.json). */
export function readMigrationFiles(drizzleDir: string): MigrationFile[] {
  const journal = JSON.parse(readFileSync(path.join(drizzleDir, 'meta', '_journal.json'), 'utf8')) as {
    entries: Array<{ tag: string; when: number }>;
  };
  return journal.entries.map((e) => ({
    tag: e.tag,
    folderMillis: e.when,
    content: readFileSync(path.join(drizzleDir, `${e.tag}.sql`), 'utf8')
  }));
}

/** Reads one line from the terminal without echoing it. Requires an interactive TTY. */
export function promptHidden(question: string): Promise<string> {
  const stdin = process.stdin;
  if (!stdin.isTTY) return Promise.reject(new Error('An interactive terminal is required for this prompt.'));
  process.stdout.write(question);
  return new Promise((resolve, reject) => {
    let value = '';
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          cleanup();
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (ch === '\u0003') {
          cleanup();
          reject(new Error('Cancelled.'));
          return;
        }
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    const cleanup = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
    };
    stdin.on('data', onData);
  });
}

/** Visible prompt (for typed confirmations). Requires an interactive TTY. */
export async function promptVisible(question: string): Promise<string> {
  if (!process.stdin.isTTY) throw new Error('An interactive terminal is required for this confirmation.');
  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}
