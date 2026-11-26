---
type: notes
title: "W25 · S1 · Hardening: Validation, Error Handling, Security, Performance and Accessibility"
slug: w25-s1-hardening-security-quality
topic: Hardening & Security
subject: web-development
minutes: 35
description: Make the capstone robust before deployment — server-side validation, central error handling, a practical security checklist, quick performance wins and basic accessibility.
---
# Hardening: validation, error handling, security, performance and accessibility

The features are in. This week the team stops adding and starts **hardening**: making the app behave well when users
make mistakes, when something fails, and when someone tries to misuse it. The tutor's rule for this week: **freeze
features by mid-week**. New ideas go on a "future scope" slide, not into the codebase.

## 1. Validate every input on the server

Client-side validation is for the user's convenience. **Server-side validation is for correctness and security**,
because anyone can send a request without your UI (with `curl`, Postman or the browser console).

With Zod in an Express route:

```js
import { z } from 'zod';

const createDriveSchema = z.object({
  companyId: z.number().int().positive(),
  title: z.string().trim().min(3).max(120),
  minCgpa: z.number().min(0).max(10),
  maxBacklogs: z.number().int().min(0).max(10),
  branches: z.array(z.enum(['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL'])).min(1),
  deadline: z.coerce.date(),
});

app.post('/api/drives', requireAuth, requireRole('coordinator'), async (req, res, next) => {
  const parsed = createDriveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  try {
    const drive = await createDrive(parsed.data);   // only validated data reaches the database
    res.status(201).json(drive);
  } catch (err) {
    next(err);                                       // hand unexpected errors to the error handler
  }
});
```

Python teams get the same effect with Pydantic models in FastAPI, or explicit checks before writing to the database
in Streamlit.

## 2. Handle errors in one place

Unexpected errors should be **logged in full on the server** and shown to the user as a short, safe message. Never
send stack traces or SQL errors to the browser; they reveal table names and code paths.

```js
// Register after all routes
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});
```

On the client, every API call already goes through one helper (Week 24), so errors show up as a message on screen
rather than a blank page.

## 3. Security checklist

Work through this list for your own app. Each item maps to a common real-world weakness.

| # | Check | How |
|---|---|---|
| 1 | **No secrets in Git** | `.env` ignored; keys only in host environment variables; search history with `git log -p` for anything that looks like a key. A leaked key must be **revoked and replaced**, not just deleted from the file. |
| 2 | **Passwords hashed** | bcrypt (or Argon2) with a per-password salt; never stored or logged in plain text |
| 3 | **SQL injection prevented** | parameterised queries or an ORM, never string concatenation |
| 4 | **Access control on the API** | every protected route checks authentication **and** role or ownership (a student can read only their own applications) |
| 5 | **XSS prevented** | let React escape output; avoid `dangerouslySetInnerHTML`; never insert user text into HTML strings |
| 6 | **CORS restricted** | only your front-end origin is allowed |
| 7 | **Security headers** | `helmet` middleware in Express sets sensible defaults |
| 8 | **Login abuse limited** | a rate limiter on login and signup routes |
| 9 | **Sensitive data minimised** | API responses never include `password_hash`; logs never include passwords or tokens |
| 10 | **HTTPS only in production** | hosting platforms provide it; never send tokens over plain HTTP |

Parameterised query (Node.js `pg`) versus the dangerous version:

```js
// Safe: the value is sent separately from the SQL text
const { rows } = await pool.query(
  'SELECT id, title FROM drives WHERE company_id = $1',
  [companyId]
);

// Dangerous: never build SQL by joining strings with user input
// pool.query(`SELECT * FROM drives WHERE company_id = ${req.query.companyId}`);
```

Password hashing with the `bcrypt` package:

```js
import bcrypt from 'bcrypt';

const passwordHash = await bcrypt.hash(plainPassword, 12);   // on signup
const ok = await bcrypt.compare(plainPassword, user.password_hash);   // on login
```

**AI projects:** keep the LLM API key on the server only; set a maximum input length; do not send personal data to the
model; and treat model output as untrusted text (escape it before display).

## 4. Performance quick wins

You do not need a performance project. A few targeted changes fix most slow capstones:

| Symptom | Quick win |
|---|---|
| List page slows as data grows | **Paginate**: `LIMIT 20 OFFSET 40`, or keyset pagination on `id` |
| Filtering by a column is slow | **Add an index** on the column in `WHERE` or `JOIN` (for example `applications(student_id)`) |
| One request makes 50 queries | **N+1 problem**: fetch related rows with one `JOIN` or `WHERE id = ANY($1)` |
| Dashboard recalculates every time | Cache the result for a minute, or precompute it |
| Page is heavy to load | Compress images; load charts only on the page that needs them |
| Streamlit app reloads the model on every click | Cache it with `@st.cache_resource` |

Measure before and after: the browser's **Network** tab shows request times, and `EXPLAIN ANALYZE` in PostgreSQL shows
whether a query uses an index.

## 5. Accessibility basics

Accessible apps work for more people, including keyboard and screen-reader users, and they usually work better for
everyone.

- [ ] Every input has a visible `<label>` connected to it (not just placeholder text).
- [ ] Every meaningful image has `alt` text; decorative images have `alt=""`.
- [ ] Buttons are real `<button>` elements, not clickable `<div>`s, so they work with the keyboard.
- [ ] You can complete the main journey using only **Tab**, **Enter** and **Space**, and you can see where focus is.
- [ ] Text has enough contrast with its background; colour is not the only signal (add text or an icon to red/green
      status badges).
- [ ] Error messages say what is wrong and how to fix it ("CGPA must be between 0 and 10").

Chrome DevTools includes a **Lighthouse** panel that reports accessibility, performance and best-practice issues.
Run it on your main pages and fix the top items.

## Lab: security and quality checklist

1. Copy the security checklist into `docs/security-checklist.md`. Mark each item done, with a one-line note of how
   (file or PR link). Fix anything not done.
2. Add server-side validation to every write endpoint and the central error handler.
3. Apply at least two performance quick wins and record the before/after timing.
4. Run Lighthouse on your two main pages; fix the top accessibility issues.
5. Announce the feature freeze on the team board.

## Check yourself

1. Why is client-side validation alone not enough?
2. A teammate accidentally committed an API key last week and deleted it in a later commit. Is the problem solved?
   What must happen?
3. Your applications list takes 3 seconds with 5,000 rows. Name two changes you would try first.
