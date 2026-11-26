---
type: resource
title: "W14 · Cheat Sheet: Express, REST, Validation, PostgreSQL and Auth"
slug: w14-cheat-sheet
topic: Week 14 Reference
subject: web-development
minutes: 10
description: One-page reference for Week 14 — Express setup and middleware order, REST methods and status codes, Zod validation, pg queries and migrations, bcrypt and JWT, the back-end interview theory sheet and this week's tasks.
---
# Week 14 cheat sheet

## Express skeleton (works on Express 4 and 5)

```js
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());                                   // before routes that read req.body
app.use('/api/v1/notes', notesRouter);                      // routers per resource
app.use((req, res, next) => next(new HttpError(404, 'Route not found')));
app.use(errorHandler);                                      // (err, req, res, next): always last
app.listen(process.env.PORT ?? 4000);

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
```

| Input | Read with | Type |
|---|---|---|
| `/notes/:id` | `req.params.id` | string |
| `?tag=os` | `req.query.tag` | string |
| JSON body | `req.body` | parsed object (needs `express.json()`) |
| Header | `req.get('Authorization')` | string |

Layers: **routes** (URL → handler) → **controllers** (req/res, status codes) → **services** (rules + database).

## REST quick reference

| Action | Method + URL | Success |
|---|---|---|
| List | `GET /api/v1/notes?tag=os&limit=20` | 200 |
| Read one | `GET /api/v1/notes/7` | 200 (404 if missing) |
| Create | `POST /api/v1/notes` | 201 + new resource |
| Partial update | `PATCH /api/v1/notes/7` | 200 |
| Replace | `PUT /api/v1/notes/7` | 200 |
| Delete | `DELETE /api/v1/notes/7` | 204 |

Errors: **400** bad input · **401** not logged in · **403** logged in but not allowed · **404** not found ·
**409** conflict (duplicate) · **500** server bug (generic message, log the details).

## Validation (Zod)

```js
const createNoteSchema = z.object({ title: z.string().trim().min(1).max(120), body: z.string().default('') });
const result = createNoteSchema.safeParse(req.body);   // { success, data } or { success: false, error }
const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(req.params);   // throws ZodError
```

## PostgreSQL from Node (pg)

```js
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query('SELECT * FROM notes WHERE id = $1', [id]);        // parameterised!
const { rows: [note] } = await pool.query('INSERT INTO notes (title) VALUES ($1) RETURNING *', [title]);
const { rowCount } = await pool.query('DELETE FROM notes WHERE id = $1', [id]);
```

Unique violation `23505` → 409. Migrations: numbered SQL files, never edit one that has run. Seeds: dev data only.
Load env: `node --env-file=.env src/server.js` (Node 20.6+) or `import 'dotenv/config'`.

## Auth

```js
const hash = await bcrypt.hash(password, 12);           // store this, never the password
const ok = await bcrypt.compare(password, hash);
const token = jwt.sign({ sub: String(user.id), role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
const payload = jwt.verify(token, process.env.JWT_SECRET);   // throws if tampered or expired
// client sends: Authorization: Bearer <token>
```

- [ ] `requireAuth` on every write route; ownership check in the service (403 if not yours)
- [ ] Same login error for "no such email" and "wrong password"
- [ ] `.env` ignored; `.env.example` committed; leaked secret → **rotate first**
- [ ] CORS limited to your client origin (CORS is not authentication)

## Back-end interview theory sheet (career task)

| Question | Short answer |
|---|---|
| REST vs RPC | REST models **resources** with standard HTTP methods (`DELETE /notes/7`); RPC exposes **actions** as calls (`POST /deleteNote`, gRPC methods). REST is uniform and cache-friendly; RPC maps directly to functions |
| Stateless | Each request carries everything needed (including auth); the server keeps no per-client memory between requests, so any server instance can handle it |
| 401 vs 403 | 401: identity missing or invalid. 403: identity known, permission denied |
| Authentication vs authorisation | Who you are vs what you may do |
| PUT vs PATCH | PUT replaces the whole resource (idempotent); PATCH changes some fields |
| Why hash with bcrypt | Slow and salted, so leaked hashes resist guessing; fast hashes do not |
| JWT vs session | JWT: self-contained signed token, hard to revoke. Session: server-side state, easy to revoke |
| SQL injection defence | Parameterised queries; never concatenate input into SQL |

## This week

| Item | Details |
|---|---|
| **Deliverable** | REST API repository with Postman/Thunder Client collection and `.env.example`, no real secrets: Weekly Build WB-14 (Campus Marketplace 3/3) |
| **Practice quiz** | Back End with Node.js, Express & Databases (untimed, retakes allowed) |
| **Weekly test** | 15 questions on Express, REST, validation, databases and authentication, 25 minutes |
| **DSA** | BSTs: Validate (LC 98), LCA of a BST (235), Kth Smallest (230), Insert (701), Sorted Array to BST (108) |
| **Career task** | Complete the back-end interview theory sheet above in your own words and add it to your notes |
