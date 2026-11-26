---
type: notes
title: "W14 · S1 · Node.js and Express: Runtime, Routing, Middleware and Project Structure"
slug: w14-s1-node-express-basics
topic: Node.js & Express
subject: web-development
minutes: 40
description: What Node.js is, ES modules and npm scripts on the server, your first Express app, routing and route params, how middleware works, and the routes → controllers → services structure used for the rest of Phase 3.
---
# Node.js and Express: your first API

So far your React app has talked to a fake API. This week you build the real one. The back end decides what data
exists, who may see or change it, and keeps it safe in a database. You will write it in JavaScript, with **Node.js**
and **Express**.

## What Node.js is

**Node.js** is a JavaScript runtime outside the browser. It uses the same V8 engine as Chrome, but instead of the DOM
and `window` it gives you access to files, the network and environment variables.

| Browser JavaScript | Node.js |
|---|---|
| `document`, `window`, `localStorage` | none of these |
| Runs code the user downloads | Runs code on a machine you control |
| Can never hold secrets | Can read secrets from environment variables |
| `fetch` | `fetch` too (built in since Node 18), plus `fs`, `path`, `http`, `process` |

Node runs JavaScript on **one main thread** with the same **event loop** you met in Week 11. Slow work (disk, network,
database) is handed off and its callback or promise resumes later, so one Node process can serve many requests at
once as long as you never block the thread with long synchronous loops.

Install the current **LTS** (long-term support) version from nodejs.org and check:

```bash
node --version
npm --version
```

## Modules: CommonJS and ES modules

Node supports two module systems. You will see both in tutorials:

```js
// CommonJS (older, still common)
const express = require('express');
module.exports = { add };

// ES modules (modern, the same syntax as your React code)
import express from 'express';
export function add(a, b) { return a + b; }
```

We use **ES modules**. Turn them on with `"type": "module"` in `package.json`. With ES modules, relative imports need
the file extension: `import { router } from './routes/notes.js';`.

## Setting up the project

```bash
mkdir notes-api && cd notes-api
npm init -y
npm install express
```

Edit `package.json` (npm has already added `express` under `dependencies`; keep that block):

```json
{
  "name": "notes-api",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/server.js",
    "start": "node src/server.js"
  }
}
```

`node --watch` restarts the server whenever you save a file. Add a `.gitignore` with `node_modules/` and `.env`
before your first commit. The code in these notes works with Express 4 and Express 5.

## Hello API with three routes

```js
// src/server.js
import express from 'express';

const app = express();
app.use(express.json());          // parse JSON request bodies into req.body

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/greet/:name', (req, res) => {
  res.json({ message: `Hello, ${req.params.name}!` });
});

app.post('/api/echo', (req, res) => {
  res.status(201).json({ youSent: req.body });
});

const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
```

Try it:

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/greet/Asha
curl -X POST http://localhost:4000/api/echo -H "Content-Type: application/json" -d "{\"course\":\"B.Tech\"}"
```

On Windows PowerShell, `curl` may be an alias for a different command; use `curl.exe`, or use the Thunder Client
extension in VS Code (Session 2).

### Where request data comes from

| Source | Example request | Read it with |
|---|---|---|
| Route param | `GET /api/notes/7` | `req.params.id` |
| Query string | `GET /api/notes?tag=dbms&page=2` | `req.query.tag`, `req.query.page` (strings) |
| JSON body | `POST /api/notes` with `{ "title": "..." }` | `req.body.title` (needs `express.json()`) |
| Headers | `Authorization: Bearer abc` | `req.get('Authorization')` |

All params and query values arrive as **strings**. Validate and convert them (Session 2).

## Middleware: the heart of Express

A **middleware** is a function `(req, res, next)` that runs on the way to your route handler. It can read or modify
`req`, end the request by sending a response, or call `next()` to pass control on.

```text
request → express.json() → logger → auth check → route handler → response
```

```js
// a tiny request logger
function logger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();                       // forget this and the request hangs forever
}

app.use(logger);                // runs for every request registered after this line
```

Order matters: Express runs middleware **in the order you register it**. `express.json()` must come before routes
that read `req.body`. A middleware can also be attached to a single route:
`app.post('/api/notes', requireLogin, createNote)`.

A **404 handler** is just a middleware registered after all routes; if a request reaches it, nothing else matched:

```js
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});
```

## Routers: grouping related routes

Put each resource's routes in its own file with `express.Router()`, then mount it under a prefix.

```js
// src/routes/notes.routes.js
import { Router } from 'express';
import * as notes from '../controllers/notes.controller.js';

export const notesRouter = Router();

notesRouter.get('/', notes.list);
notesRouter.get('/:id', notes.getOne);
notesRouter.post('/', notes.create);
```

```js
// src/app.js
import express from 'express';
import { notesRouter } from './routes/notes.routes.js';

export const app = express();
app.use(express.json());
app.use('/api/v1/notes', notesRouter);   // GET /api/v1/notes/7 → notes.getOne
```

Splitting `app.js` (builds the app) from `server.js` (calls `listen`) lets tests import the app without opening a port.

## Project structure: routes → controllers → services

| Layer | Knows about | Does |
|---|---|---|
| **Routes** | URLs and middleware | Maps `GET /notes/:id` to a controller function |
| **Controllers** | `req` and `res` | Reads input, calls a service, chooses the status code and response |
| **Services** | Business rules and data | Validates rules, talks to the database; no `req`/`res` |

```text
src/
  server.js              app.listen
  app.js                 express(), global middleware, mount routers, error handler
  routes/notes.routes.js
  controllers/notes.controller.js
  services/notes.service.js
  middleware/            logger, auth, validate, errorHandler
  db/                    connection, migrations, seed (Session 3)
```

```js
// src/services/notes.service.js  (in-memory for now; a database in Session 3)
const notes = [];
let nextId = 1;

export function listNotes() {
  return notes;
}

export function findNote(id) {
  return notes.find((n) => n.id === id) ?? null;
}

export function createNote({ title, body }) {
  const note = { id: nextId++, title, body, createdAt: new Date().toISOString() };
  notes.push(note);
  return note;
}
```

```js
// src/controllers/notes.controller.js
import * as service from '../services/notes.service.js';

export function list(req, res) {
  res.json(service.listNotes());
}

export function getOne(req, res) {
  const note = service.findNote(Number(req.params.id));
  if (!note) return res.status(404).json({ error: 'Note not found' });
  res.json(note);
}

export function create(req, res) {
  const note = service.createNote(req.body);
  res.status(201).json(note);
}
```

Why bother? Services can be unit-tested without HTTP, swapped from an array to PostgreSQL without touching routes, and
reused by other controllers. Interviewers recognise this structure immediately.

### Async handlers in Express 4 and 5

Database calls are asynchronous. Express 5 automatically sends a rejected promise from an `async` handler to the error
handler; **Express 4 does not**, and the request hangs. A three-line wrapper makes your code safe on both:

```js
// src/middleware/asyncHandler.js
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// usage: notesRouter.get('/', asyncHandler(notes.list));
```

## Lab: Hello API with three routes

1. Create `notes-api` with `"type": "module"`, Express, a `dev` script using `node --watch`, and a `.gitignore`.
2. Implement `GET /api/health`, `GET /api/greet/:name` and `POST /api/echo` and test each with curl or Thunder
   Client.
3. Add the logger middleware and a JSON 404 handler; request an unknown path and check the log line.
4. Refactor into `app.js` + `server.js` and the routes → controllers → services structure with an in-memory notes
   service: list, get by id (404 if missing) and create (201).
5. Commit with a message such as `Add Express notes API skeleton with layered structure`.

## Check yourself

1. You registered `app.use(express.json())` **after** your `POST /api/notes` route and `req.body` is `undefined`.
   Why?
2. A middleware logs the request but the browser waits forever for a response. What did the middleware forget?
3. Which layer should decide "a student cannot create more than 50 notes": the route, the controller or the
   service? Why?
