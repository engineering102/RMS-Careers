import 'server-only';

import { Client } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';
import type { DbClient } from './index';
import { assertVitestConnectionSafe } from './guard';

/**
 * Transactional entry point (`@rms/db/tx`).
 *
 * The root `@rms/db` client uses neon-http, which CANNOT run db.transaction().
 * Anything that needs an interactive transaction must import `dbTx` from here.
 * Kept out of the root entry so apps that never open transactions (apps/web,
 * deployed to Cloudflare) do not bundle the WebSocket driver path.
 *
 * Each `dbTx.transaction()` call owns a short-lived Neon `Client` (one WebSocket):
 * create -> connect -> BEGIN/COMMIT|ROLLBACK -> end. No Pool, no cached clients, and no
 * `ws` package: the driver uses the runtime's global WebSocket (Workers, Node >= 22).
 * A Drizzle transaction over a `Client` (not a `Pool`) runs on that single connection and
 * keeps nested-transaction savepoint semantics.
 */

export type TxDatabase = NeonDatabase<typeof schema>;
export type TxTransaction = Parameters<Parameters<TxDatabase['transaction']>[0]>[0];
/** Any context that can run queries: the HTTP client, the transactional client, or a transaction. */
export type AnyDbClient = DbClient | TxDatabase | TxTransaction;

const CONNECTION_TIMEOUT_MS = 10_000;

function logSafe(context: string, err: unknown): void {
  // Message only: never the connection string or the full error object.
  console.error(`[db/tx] ${context}:`, err instanceof Error ? err.message : 'unknown error');
}

async function runTransaction<T>(
  callback: (tx: TxTransaction) => Promise<T>,
  config?: Parameters<TxDatabase['transaction']>[1]
): Promise<T> {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL is not set; transactional client unavailable.');
  }

  assertVitestConnectionSafe(connectionString, process.env);

  const client = new Client({ connectionString, connectionTimeoutMillis: CONNECTION_TIMEOUT_MS });
  // An 'error' event with no listener becomes an uncaught exception.
  client.on('error', (err: Error) => logSafe('client error', err));

  try {
    await client.connect();
    return await drizzle(client, { schema }).transaction(callback, config);
  } finally {
    try {
      await client.end();
    } catch (endErr) {
      // Never let cleanup failure replace the transaction's own outcome or error.
      logSafe('client.end() failed', endErr);
    }
  }
}

/**
 * Transaction-only database handle. Only `transaction()` is supported; any other access
 * throws so a caller cannot accidentally run non-transactional queries through it. It is
 * typed as TxDatabase only so existing call sites (e.g. AnyDbClient defaults) keep compiling.
 * POSTGRES_URL is read per call, never at import time.
 */
export const dbTx: TxDatabase = new Proxy(
  { transaction: runTransaction } as unknown as TxDatabase,
  {
    get(target, prop, receiver) {
      if (prop === 'transaction') return Reflect.get(target, prop, receiver);
      if (typeof prop === 'symbol' || prop === 'then') return undefined;
      throw new Error(`dbTx only supports transaction(); "${String(prop)}" is not available.`);
    }
  }
);
