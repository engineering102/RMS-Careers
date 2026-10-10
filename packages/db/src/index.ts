import 'server-only';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { assertVitestConnectionSafe } from './guard';

// Provide a fallback connection string if POSTGRES_URL is unset in development/build
const connectionString =
  process.env.POSTGRES_URL || 'postgres://placeholder:placeholder@localhost:5432/academy_enrollment';

// Under Vitest only local mock URLs or the validated TEST_DATABASE_URL may be used (Slice 0 guard).
assertVitestConnectionSafe(connectionString, process.env);

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
export type Database = typeof db;
export type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbClient = Database | TransactionClient;

export * from './schema';
export { schema };
