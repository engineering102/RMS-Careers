---
type: notes
title: "W14 · S4 · Authentication and API Security: bcrypt, JWT, Sessions, CORS and Secrets"
slug: w14-s4-authentication-security
topic: Authentication & Security
subject: web-development
minutes: 45
description: Hashing passwords with bcrypt, signup and login endpoints, JWTs versus session cookies, protecting routes and checking ownership, CORS, environment variables and leaked secrets, and the OWASP Top 10 as a checklist.
---
# Authentication and API security

Right now anyone can create, edit and delete any note. This session adds **authentication** (proving who you are)
and **authorisation** (deciding what you may do), and covers the security basics every back-end interview touches.

| Term | Question it answers | HTTP failure |
|---|---|---|
| Authentication | Who are you? | 401 Unauthorized |
| Authorisation | Are you allowed to do this? | 403 Forbidden |

## Storing passwords: hash, never encrypt, never plain text

If your database leaks, plain-text passwords are instantly usable, and many people reuse passwords across sites.
Store a **hash** instead: a one-way function, so you can check a password but never recover it.

General hashes like SHA-256 are designed to be fast, which helps attackers try billions of guesses. Password hashing
uses **slow, salted** algorithms such as **bcrypt** (also argon2 and scrypt):

- **Salt**: random data mixed in per user, so two users with the same password get different hashes and
  precomputed tables are useless. bcrypt generates and stores the salt inside the hash string.
- **Cost factor**: how slow each hash is. A cost of 12 is a common choice; each +1 doubles the work.

```bash
npm install bcryptjs jsonwebtoken
```

`bcryptjs` is a pure-JavaScript version of bcrypt that installs anywhere without build tools. The native `bcrypt`
package has the same `hash`/`compare` API and is faster.

```js
import bcrypt from 'bcryptjs';

const hash = await bcrypt.hash('correct horse battery', 12);   // "$2a$12$..." 60 characters
await bcrypt.compare('correct horse battery', hash);            // true
await bcrypt.compare('wrong guess', hash);                      // false
```

## Users table and signup

```sql
-- db/migrations/003_create_users.sql
CREATE TABLE users (
  id             SERIAL PRIMARY KEY,
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           VARCHAR(20) NOT NULL DEFAULT 'student',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE notes ADD COLUMN owner_id INTEGER REFERENCES users(id);
```

```js
// src/services/auth.service.js
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { HttpError } from '../errors.js';

export async function signup({ email, password }) {
  const hash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, role',
      [email.toLowerCase(), hash]
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'Email already registered');
    throw err;
  }
}

export async function login({ email, password }) {
  const { rows } = await query('SELECT id, email, role, password_hash FROM users WHERE email = $1', [
    email.toLowerCase(),
  ]);
  const user = rows[0];
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) throw new HttpError(401, 'Invalid email or password');   // same message for both cases
  return { id: user.id, email: user.email, role: user.role };
}
```

Validate the signup body with Zod (`email: z.string().email()`, `password: z.string().min(8)`). Notice the login
error does not say whether the email exists; saying "no such user" lets attackers discover which emails are
registered. Never return `password_hash` in any response.

## Staying logged in: JWT or session cookie

HTTP is stateless, so after login the client must prove its identity on **every** request. Two common designs:

| | **JWT (JSON Web Token)** | **Server session + cookie** |
|---|---|---|
| What the client holds | A signed token: `header.payload.signature` | A random session id in a cookie |
| Where state lives | In the token itself (user id, role, expiry) | In a server-side store (database, Redis) |
| How it is sent | Usually `Authorization: Bearer <token>` header | Browser sends the cookie automatically |
| Logout / revoke | Hard before expiry; keep tokens short-lived | Delete the session row: instant |
| Main risk | Token stolen via XSS if stored in `localStorage` | CSRF, mitigated with `SameSite` cookies |

Both are used in industry. We use JWTs here because they are easy to test from Thunder Client and from a front end on
a different domain (Week 15).

A JWT is **signed, not encrypted**: anyone can decode and read the payload, but nobody can change it without the
secret. Never put sensitive data in it.

```js
// src/services/token.js
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;    // long random string from .env

export const signToken = (user) =>
  jwt.sign({ sub: String(user.id), role: user.role }, SECRET, { expiresIn: '1h' });

export const verifyToken = (token) => jwt.verify(token, SECRET);   // throws if invalid or expired
```

Generate a strong secret once and keep it in `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

```js
// src/controllers/auth.controller.js
export async function loginHandler(req, res) {
  const user = await authService.login(req.body);
  res.json({ token: signToken(user), user });
}

export async function me(req, res) {
  res.json({ user: req.user });
}
```

## Protecting routes

A middleware reads the token, verifies it and attaches the user to `req`:

```js
// src/middleware/auth.js
import { verifyToken } from '../services/token.js';
import { HttpError } from '../errors.js';

export function requireAuth(req, res, next) {
  const header = req.get('Authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new HttpError(401, 'Login required'));
  try {
    const payload = verifyToken(token);
    req.user = { id: Number(payload.sub), role: payload.role };
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : next(new HttpError(403, 'Not allowed'));
```

```js
notesRouter.get('/', asyncHandler(notes.list));                                   // public
notesRouter.post('/', requireAuth, validateBody(createNoteSchema), asyncHandler(notes.create));
notesRouter.delete('/:id', requireAuth, asyncHandler(notes.remove));
adminRouter.use(requireAuth, requireRole('admin'));                               // whole router
```

**Ownership check.** Being logged in is not enough to edit a note: it must be **your** note. Check in the service,
using the id from the verified token, never an id sent in the request body (add `owner_id AS "ownerId"` to the
`COLUMNS` list from Session 3):

```js
export async function deleteNote(id, userId) {
  const note = await findNote(id);
  if (!note) throw notFound('Note');
  if (note.ownerId !== userId) throw new HttpError(403, 'You can only delete your own notes');
  await query('DELETE FROM notes WHERE id = $1', [id]);
}
```

Missing ownership checks are the most common serious bug in student APIs: **Broken Access Control**.

## CORS

Browsers block a page on one **origin** (scheme + host + port) from reading responses from another origin unless the
server allows it. Your React app on `http://localhost:5173` calling `http://localhost:4000` is cross-origin.

```bash
npm install cors
```

```js
import cors from 'cors';

app.use(cors({ origin: process.env.CLIENT_ORIGIN }));   // e.g. http://localhost:5173
```

- CORS is enforced **by browsers**. It does not stop curl, Postman or attackers' scripts; it is not authentication.
- Avoid `origin: '*'` on an API that uses credentials. List your real front-end origins.
- If you use cookies across origins, add `credentials: true` here and `credentials: 'include'` in `fetch`.

## Environment variables and secrets

- Secrets (`DATABASE_URL`, `JWT_SECRET`, API keys) come from environment variables, read via `process.env`.
- `.env` is in `.gitignore` **before the first commit**; `.env.example` lists names with fake values.
- Fail fast at start-up if a required variable is missing:

```js
for (const name of ['DATABASE_URL', 'JWT_SECRET', 'CLIENT_ORIGIN']) {
  if (!process.env[name]) throw new Error(`Missing environment variable ${name}`);
}
```

**If a secret is committed**, deleting the file in a new commit is not enough; it stays in Git history and may
already be copied by bots that scan public repositories. Do this, in order:

1. **Rotate** it immediately: change the database password, generate a new JWT secret, revoke the API key.
2. Update the new value wherever the app runs.
3. Optionally rewrite history (for example with `git filter-repo`) so it is not easy to find, and add the file to
   `.gitignore`.

Rotation is the step that actually protects you.

## OWASP Top 10: a checklist for your API

The **OWASP Top 10** is a widely used list of the most critical web application security risks. Categories from the
2021 edition and what they mean for this week's code:

| Risk | In your API |
|---|---|
| Broken Access Control | Ownership and role checks on every write route |
| Cryptographic Failures | bcrypt for passwords; HTTPS in production; no secrets in code |
| Injection | Parameterised SQL only; validate all input |
| Security Misconfiguration | No stack traces in responses; strict CORS; no default passwords |
| Vulnerable and Outdated Components | Run `npm audit`; keep dependencies updated |
| Identification and Authentication Failures | Generic login errors; token expiry; rate-limit login |

Check owasp.org for the latest edition of the list.

## Lab: signup, login and protected write routes

1. Add the users migration and `owner_id` on notes; run it.
2. Implement `POST /api/v1/auth/signup` (201), `POST /api/v1/auth/login` (returns a token) and
   `GET /api/v1/auth/me` (requires a token), with Zod validation.
3. Add `requireAuth` to create, update and delete; set `owner_id` from `req.user.id` on create.
4. Enforce ownership on update and delete (403 for someone else's note).
5. Add CORS for `CLIENT_ORIGIN`, the start-up env check and `JWT_SECRET` in `.env.example`.
6. Test with two users in Thunder Client: user B must get 403 when deleting user A's note, and a request with no
   token must get 401.
7. Run `git log --all --stat` and confirm no `.env` file has ever been committed.

## Check yourself

1. Why is SHA-256 a poor choice for storing passwords, even though it is a secure hash function?
2. A JWT payload contains `"role": "student"`. Can a user edit it to `"admin"` in their browser and gain admin
   access? Explain.
3. Your API has CORS restricted to your front-end origin. Does that stop an attacker deleting notes with curl? What
   does?
