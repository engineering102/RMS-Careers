---
type: notes
title: "W14 · S2 · REST API Design, Input Validation and Central Error Handling"
slug: w14-s2-rest-validation-errors
topic: REST APIs
subject: web-development
minutes: 40
description: Designing REST resources and URLs, choosing HTTP methods and status codes, versioning, validating input with Zod, a central error-handling middleware with consistent JSON errors, and testing with Thunder Client or Postman.
---
# REST API design, validation and error handling

An API is a contract. Front-end developers, mobile apps and other teams build against it, so it must be
**predictable**: the same URL shapes, the same status codes, the same error format everywhere. This session gives you
the conventions, then enforces them with validation and one central error handler.

## REST in one paragraph

**REST** (Representational State Transfer) is a style for HTTP APIs built around **resources** (nouns such as notes,
items, users) identified by URLs, and a small set of **methods** (verbs) that act on them. Each request carries
everything the server needs to process it: REST is **stateless**, so the server does not remember earlier requests
(authentication is sent with every request, as you will see in Session 4).

## Designing URLs

| Good | Avoid | Why |
|---|---|---|
| `GET /api/v1/notes` | `GET /api/getAllNotes` | The method is the verb; the URL is the noun |
| `GET /api/v1/notes/7` | `GET /api/v1/note?id=7` | Plural collection, id in the path |
| `POST /api/v1/notes` | `POST /api/v1/notes/create` | POST to the collection already means "create" |
| `GET /api/v1/users/3/notes` | `GET /api/v1/notesOfUser/3` | Nest only for clear ownership, one level deep |
| `GET /api/v1/notes?tag=dbms&page=2` | `GET /api/v1/notes/tag/dbms/page/2` | Filters, sorting and paging go in the query string |

**Versioning**: prefix with `/api/v1`. When you must make a breaking change, ship `/api/v2` and keep v1 running until
clients have moved.

## Methods

| Method | Meaning | Body | Safe | Idempotent |
|---|---|---|---|---|
| GET | Read | no | yes | yes |
| POST | Create (server picks the id) | yes | no | no |
| PUT | Replace the whole resource | yes | no | yes |
| PATCH | Update some fields | yes | no | not guaranteed |
| DELETE | Delete | usually no | no | yes |

**Safe** means it does not change data. **Idempotent** means doing it twice has the same effect as doing it once:
deleting note 7 twice leaves note 7 deleted, but posting the same note twice creates two notes. This matters when a
client retries after a timeout.

## Status codes you must know

| Code | Name | Use it when |
|---|---|---|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST; return the new resource |
| 204 | No Content | Successful DELETE with no body |
| 400 | Bad Request | Invalid input (validation failed, malformed JSON) |
| 401 | Unauthorized | Not logged in, or the token is missing or invalid |
| 403 | Forbidden | Logged in, but not allowed (not your note, wrong role) |
| 404 | Not Found | The resource does not exist |
| 409 | Conflict | Clashes with existing data (email already registered) |
| 422 | Unprocessable Content | Some APIs use this instead of 400 for validation errors; pick one and be consistent |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | A bug or failure on the server; never leak the stack trace |

The 401 vs 403 distinction is a favourite interview question: **401 = who are you?**, **403 = I know who you are,
and the answer is no.**

## A consistent error format

Pick one JSON shape for every error and never deviate:

```json
{
  "error": "Validation failed",
  "details": [{ "path": "title", "message": "Title is required" }]
}
```

The front end can then show `error` in a toast and `details` beside the matching form fields.

## Validating input with Zod

Never trust `req.body`. It may be missing fields, have the wrong types, or contain fields you did not ask for.
**Zod** describes the expected shape once and checks it.

```bash
npm install zod
```

```js
// src/schemas/note.schema.js
import { z } from 'zod';

export const createNoteSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  body: z.string().max(5000).default(''),
  tags: z.array(z.string().trim().min(1)).max(10).default([]),
});

export const updateNoteSchema = createNoteSchema.partial();   // every field optional for PATCH

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),                       // "7" → 7; "abc" fails
});
```

`safeParse` never throws; it returns either `{ success: true, data }` or `{ success: false, error }`. The `data` is
cleaned: strings trimmed, defaults filled and unknown keys removed.

### A reusable validation middleware

```js
// src/middleware/validate.js
import { HttpError } from '../errors.js';

export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return next(new HttpError(400, 'Validation failed', details));
  }
  req.body = result.data;           // downstream code sees only clean, typed data
  next();
};
```

```js
notesRouter.post('/', validateBody(createNoteSchema), asyncHandler(notes.create));
notesRouter.patch('/:id', validateBody(updateNoteSchema), asyncHandler(notes.update));
```

Joi is an older library that does the same job with a similar API; either is fine, but use one consistently.

## Central error handling

Instead of building error responses in every controller, **throw** (or pass to `next`) a typed error and let one
middleware format all of them.

```js
// src/errors.js
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
export const notFound = (what = 'Resource') => new HttpError(404, `${what} not found`);
```

```js
// src/middleware/errorHandler.js
export function errorHandler(err, req, res, next) {   // four arguments: Express recognises an error handler
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);              // log the full error on the server only
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err.message,
    ...(err.details && { details: err.details }),
  });
}
```

```js
// src/app.js — order matters
app.use(express.json());
app.use('/api/v1/notes', notesRouter);
app.use((req, res, next) => next(notFound('Route')));   // 404 for unknown routes
app.use(errorHandler);                                   // always last
```

Controllers now read like the business logic they are:

```js
export async function getOne(req, res) {
  const { id } = idParamSchema.parse(req.params);   // parse throws a ZodError on failure
  const note = await service.findNote(id);
  if (!note) throw notFound('Note');
  res.json(note);
}
```

`parse` (unlike `safeParse`) throws a `ZodError`. Teach the error handler to turn it into a 400:

```js
import { ZodError } from 'zod';
// at the top of errorHandler:
if (err instanceof ZodError) {
  return res.status(400).json({
    error: 'Validation failed',
    details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  });
}
```

Remember the Session 1 rule: in Express 4, wrap async handlers with `asyncHandler` so thrown errors reach this
middleware.

## Testing with Thunder Client or Postman

Browsers can only easily send GET requests from the address bar. Use an API client:

- **Thunder Client**: a VS Code extension; requests live next to your code.
- **Postman**: a desktop app with collections, environments and export to JSON.

Good habits:

1. Create a **collection** per API, one request per endpoint, named like `Notes · Create (valid)`.
2. Use an **environment variable** for the base URL (`{{baseUrl}}/api/v1/notes`), so the same collection works
   locally and in production.
3. Save **failure cases** too: missing title, title of 500 characters, id `abc`, unknown id, malformed JSON.
4. Export the collection to `docs/` in your repository so reviewers can run it.

## Lab: Notes API with validation

1. Implement the full notes resource on your Session 1 skeleton: `GET /`, `GET /:id`, `POST /`, `PATCH /:id`,
   `DELETE /:id` (204) under `/api/v1/notes`, still in memory.
2. Add Zod schemas and `validateBody`; validate `:id` with `idParamSchema`.
3. Add `HttpError`, a 404 route handler and the central `errorHandler`; remove every `res.status(…).json({ error })`
   from controllers in favour of throwing.
4. Build a Thunder Client or Postman collection with at least 10 requests, including 5 failure cases, and check every
   status code against the table above.
5. Export the collection to `docs/notes-api.collection.json` and commit.

## Check yourself

1. A logged-in student tries to delete another student's note. Should the API return 401 or 403? Why?
2. Why is `PUT /api/v1/notes/7` idempotent while `POST /api/v1/notes` is not, and why does this matter for retries?
3. The error handler returns `err.message` for 400 errors but a generic message for 500 errors. What could leak if it
   returned the real message and stack trace for a 500?
