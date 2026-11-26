---
type: notes
title: "W14 · S3 · Databases from Node: PostgreSQL with node-postgres, MongoDB with Mongoose"
slug: w14-s3-databases-from-node
topic: Node.js & Databases
subject: web-development
minutes: 40
description: Connecting Express to PostgreSQL with a pg connection pool, parameterised CRUD queries, mapping database errors to HTTP codes, simple migrations and seed scripts, plus the same service written with Mongoose for MongoDB.
---
# Databases from Node: persisting the Notes API

Your Notes API forgets everything when the server restarts, because the notes live in an array. In Phase 2 you
designed schemas and wrote SQL; now you call that SQL from Node. Thanks to the layered structure from Session 1, only
the **service** layer changes.

## Choosing a tool

| Tool | Style | Notes |
|---|---|---|
| **node-postgres (`pg`)** | You write SQL | Small, explicit; you see exactly what runs. Used in this session |
| **Prisma** | ORM with its own schema file and generated client | Type-safe queries and built-in migrations; more setup |
| **Mongoose** | ODM for MongoDB | Schemas and validation on top of MongoDB documents |

Pick PostgreSQL unless your data is naturally document-shaped. The Campus Marketplace and MP3 both default to
PostgreSQL.

## Connecting with a pool

```bash
npm install pg
```

Opening a database connection is slow, so servers keep a **pool** of open connections and lend one to each query.

```js
// src/db/pool.js
import pg from 'pg';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const query = (text, params) => pool.query(text, params);
```

The connection string has the form `postgresql://user:password@host:5432/dbname`. It contains a password, so it lives
in `.env`, never in code:

```bash
# .env  (in .gitignore)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/notes_dev
PORT=4000
```

```bash
# .env.example  (committed: names only, fake values)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
PORT=4000
```

Load it when starting Node (Node 20.6 and later):

```json
"dev": "node --watch --env-file=.env src/server.js"
```

On older Node versions, install `dotenv` and add `import 'dotenv/config';` as the first line of `server.js`.

## Never build SQL with string concatenation

```js
// DANGEROUS: SQL injection
pool.query(`SELECT * FROM notes WHERE title = '${req.query.title}'`);
```

If a user sends `' OR '1'='1`, the query returns every row; worse inputs can delete data. Always use **parameterised
queries**: placeholders `$1, $2, …` with values passed separately. The database treats the values as data, never as
SQL.

```js
pool.query('SELECT * FROM notes WHERE title = $1', [req.query.title]);
```

## Migrations: the schema as code

A **migration** is a versioned SQL file that changes the schema. Everyone on the team (and the production database)
applies the same files in the same order, so databases never drift apart.

```sql
-- db/migrations/001_create_notes.sql
CREATE TABLE IF NOT EXISTS notes (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(120) NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  tags        TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

A minimal runner that records which files have been applied:

```js
// src/db/migrate.js
import { readdir, readFile } from 'node:fs/promises';
import { pool } from './pool.js';

const dir = new URL('../../db/migrations/', import.meta.url);

await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())');
const { rows } = await pool.query('SELECT name FROM schema_migrations');
const applied = new Set(rows.map((r) => r.name));

for (const file of (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) {
  if (applied.has(file)) continue;
  const sql = await readFile(new URL(file, dir), 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    await client.query('COMMIT');
    console.log(`applied ${file}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
await pool.end();
```

Rules: never edit a migration that has already run on a shared database; write a new one (`002_add_pinned.sql`).
Tools such as Prisma Migrate, node-pg-migrate and Knex do the same job with more features.

A **seed** script fills a development database with sample rows:

```js
// src/db/seed.js
import { pool } from './pool.js';

await pool.query('TRUNCATE notes RESTART IDENTITY');
await pool.query(
  `INSERT INTO notes (title, body, tags) VALUES
   ($1, $2, $3), ($4, $5, $6)`,
  ['DBMS unit 3', 'Normal forms recap', ['dbms'], 'OS scheduling', 'Round robin vs SJF', ['os']]
);
console.log('seeded');
await pool.end();
```

```json
"db:migrate": "node --env-file=.env src/db/migrate.js",
"db:seed": "node --env-file=.env src/db/seed.js"
```

Seeds are for development data only. Never point a seed that truncates tables at a production database.

## The service, now backed by PostgreSQL

The controllers from Session 2 stay the same, except that service calls are now awaited.

```js
// src/services/notes.service.js
import { query } from '../db/pool.js';

const COLUMNS = 'id, title, body, tags, created_at AS "createdAt", updated_at AS "updatedAt"';

export async function listNotes({ tag, limit = 20, offset = 0 } = {}) {
  if (tag) {
    const { rows } = await query(
      `SELECT ${COLUMNS} FROM notes WHERE $1 = ANY(tags) ORDER BY id DESC LIMIT $2 OFFSET $3`,
      [tag, limit, offset]
    );
    return rows;
  }
  const { rows } = await query(`SELECT ${COLUMNS} FROM notes ORDER BY id DESC LIMIT $1 OFFSET $2`, [limit, offset]);
  return rows;
}

export async function findNote(id) {
  const { rows } = await query(`SELECT ${COLUMNS} FROM notes WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function createNote({ title, body, tags }) {
  const { rows } = await query(
    `INSERT INTO notes (title, body, tags) VALUES ($1, $2, $3) RETURNING ${COLUMNS}`,
    [title, body, tags]
  );
  return rows[0];
}

export async function updateNote(id, { title, body, tags }) {
  const { rows } = await query(
    `UPDATE notes
        SET title = COALESCE($2, title),
            body = COALESCE($3, body),
            tags = COALESCE($4, tags),
            updated_at = now()
      WHERE id = $1
      RETURNING ${COLUMNS}`,
    [id, title ?? null, body ?? null, tags ?? null]
  );
  return rows[0] ?? null;
}

export async function deleteNote(id) {
  const { rowCount } = await query('DELETE FROM notes WHERE id = $1', [id]);
  return rowCount > 0;
}
```

Points to notice:

- `RETURNING` gives back the inserted or updated row in the same round trip.
- `COALESCE($2, title)` keeps the old value when a PATCH omits a field.
- Column aliases (`created_at AS "createdAt"`) give the API camelCase JSON while the database keeps snake_case.
- The controller turns `null` into 404 and `false` from `deleteNote` into 404; otherwise `204`.
- Only identifiers you control (like `COLUMNS`) are put into the SQL text. User input always goes through `$n`.

### Mapping database errors to HTTP codes

PostgreSQL reports constraint violations with codes. Translate the common ones in the error handler:

| PostgreSQL code | Meaning | HTTP |
|---|---|---|
| `23505` | unique violation (email already exists) | 409 Conflict |
| `23503` | foreign key violation (referenced row missing) | 400 or 409 |
| `23502` | not-null violation | 400 |

```js
if (err.code === '23505') return res.status(409).json({ error: 'Already exists' });
```

## The MongoDB alternative: Mongoose

If your team chose MongoDB (Atlas), run `npm install mongoose`; the service then looks like this. Controllers do not change.

```js
// src/db/mongo.js
import mongoose from 'mongoose';
export const connectMongo = () => mongoose.connect(process.env.MONGODB_URI);

// src/models/note.model.js
import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, default: '' },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }                      // adds createdAt and updatedAt
);
export const Note = mongoose.model('Note', noteSchema);

// src/services/notes.service.js
import { Note } from '../models/note.model.js';

export const listNotes = ({ tag } = {}) => Note.find(tag ? { tags: tag } : {}).sort({ _id: -1 }).limit(20);
export const findNote = (id) => Note.findById(id);
export const createNote = (data) => Note.create(data);
export const updateNote = (id, data) => Note.findByIdAndUpdate(id, data, { new: true, runValidators: true });
export const deleteNote = async (id) => (await Note.findByIdAndDelete(id)) !== null;
```

MongoDB ids are 24-character hex strings, not integers, so validate `:id` with
`mongoose.isValidObjectId(id)` instead of `z.coerce.number()`. A duplicate key error has `err.code === 11000`.

## Lab: persist the Notes API

1. Create a local database `notes_dev` (PostgreSQL from Week 5, or a free cloud database), and put `DATABASE_URL` in
   `.env`; commit `.env.example` only.
2. Add `001_create_notes.sql`, the migration runner and a seed script with five notes; add `db:migrate` and `db:seed`
   npm scripts and run both.
3. Rewrite `notes.service.js` with parameterised `pg` queries; make controllers `async` and wrap them with
   `asyncHandler`.
4. Support `?tag=` and `?limit=&offset=` on the list endpoint (validate them with Zod).
5. Re-run your Thunder Client collection: every request should behave exactly as before, and data should survive a
   server restart.
6. Add a second migration that adds `pinned BOOLEAN NOT NULL DEFAULT false`, and confirm the runner applies only the
   new file.

## Check yourself

1. Why does a server use a connection **pool** instead of opening a new connection for each request?
2. Rewrite `SELECT * FROM notes WHERE id = ` + `req.params.id` safely, and explain what attack the rewrite prevents.
3. A teammate edits `001_create_notes.sql` to add a column. Your local database already ran that migration. What
   goes wrong, and what should they have done?
