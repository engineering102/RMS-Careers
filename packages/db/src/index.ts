import 'server-only';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Provide a fallback connection string if POSTGRES_URL is unset in development/build
const connectionString =
  process.env.POSTGRES_URL || 'postgres://placeholder:placeholder@localhost:5432/academy_enrollment';

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
export type Database = typeof db;
export type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbClient = Database | TransactionClient;

export * from './schema';
export { schema };
