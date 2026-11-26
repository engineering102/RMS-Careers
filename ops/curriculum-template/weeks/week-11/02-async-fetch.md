---
type: notes
title: "W11 · S2 · Asynchronous JavaScript: Promises, async/await, the Event Loop and fetch"
slug: w11-s2-async-fetch
topic: Async JavaScript & fetch
subject: web-development
minutes: 40
description: Why JavaScript needs asynchronous code, from callbacks to promises to async/await, how the event loop orders work, and how to call REST APIs with fetch, including loading, error and empty states.
---
# Asynchronous JavaScript and fetch

## Why asynchronous?

JavaScript in the browser runs on **one main thread**. If a network request blocked that thread for two seconds, the
page would freeze: no scrolling, no clicks. So slow operations (network, timers, file reads in Node) are started, and
JavaScript carries on; when the result is ready, a **callback** runs.

## Callbacks

```js
console.log("start");
setTimeout(() => console.log("timer done"), 1000);
console.log("end");
// start, end, (one second later) timer done
```

Callbacks work, but when step 2 needs step 1's result and step 3 needs step 2's, they nest deeper and deeper
("callback hell"), and error handling must be repeated at every level.

## Promises

A **promise** is an object representing a value that will arrive later. It is in one of three states:

| State | Meaning |
|---|---|
| pending | still waiting |
| fulfilled | finished with a value |
| rejected | failed with an error |

```js
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

wait(500)
  .then(() => {
    console.log("half a second later");
    return 42;                       // passed to the next then
  })
  .then((value) => console.log(value))
  .catch((err) => console.error("failed:", err))   // catches errors from any step above
  .finally(() => console.log("cleanup"));          // runs either way
```

## async / await

`async`/`await` is promise code written to **look** synchronous:

```js
async function run() {
  try {
    await wait(500);
    console.log("half a second later");
  } catch (err) {
    console.error("failed:", err);
  } finally {
    console.log("cleanup");
  }
}
run();
```

- An `async` function **always returns a promise**.
- `await` pauses **that function** (not the whole page) until the promise settles, then gives you its value or throws
  its error.
- Use ordinary `try / catch` for errors.

### Running things in parallel

```js
// Sequential: about 2 seconds
const a = await wait(1000);
const b = await wait(1000);

// Parallel: about 1 second
const [user, repos] = await Promise.all([getUser("octocat"), getRepos("octocat")]);
```

`Promise.all` rejects as soon as any promise rejects. `Promise.allSettled` waits for all and reports each result
separately, which is useful when partial results are acceptable.

## The event loop: what prints first?

The engine runs code in this order:

1. All **synchronous** code, top to bottom (the call stack).
2. Then **every microtask** in the queue: promise callbacks (`.then`, code after `await`) and `queueMicrotask`.
3. Then **one task** from the task queue (a timer callback, an event handler), then all microtasks again, and so on.

```js
console.log("A");
setTimeout(() => console.log("B"), 0);
Promise.resolve().then(() => console.log("C"));
(async () => {
  console.log("D");
  await null;
  console.log("E");
})();
console.log("F");
// A D F C E B
```

Why: `A`, `D` and `F` are synchronous (the async function runs synchronously until its first `await`). `C` and `E`
are microtasks, so they run as soon as the synchronous code finishes, in the order they were queued. `B` is a timer
task; even with 0 ms it waits until the microtask queue is empty.

This "what prints first?" question is a common interview question. Practise until you can explain each line.

## REST basics

A REST API exposes **resources** at URLs and uses HTTP methods (Week 9) on them:

| Request | Meaning |
|---|---|
| `GET /users/octocat` | read one user |
| `GET /users/octocat/repos?sort=updated` | read a collection, with query parameters |
| `POST /issues` with a JSON body | create |
| `PATCH /issues/7` | update part of one |
| `DELETE /issues/7` | delete one |

Responses are usually **JSON**, with a status code telling you whether it worked.

## fetch

```js
const response = await fetch("https://api.github.com/users/octocat");
console.log(response.status, response.ok);   // 200 true
const user = await response.json();          // parse the JSON body (also a promise)
console.log(user.name, user.public_repos);
```

**The important trap:** `fetch` only rejects on a **network failure** (offline, DNS failure, request blocked). A
`404` or `500` response is a **successful fetch** of an error page, so you must check `response.ok` (true for status
200–299) yourself.

### A robust API helper

```js
// api.js
const BASE_URL = "https://api.github.com";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function getJson(path, { signal } = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { signal });
  } catch (err) {
    if (err.name === "AbortError") throw err;          // we cancelled it on purpose
    throw new ApiError(0, "Network error. Check your connection.");
  }
  if (response.status === 404) throw new ApiError(404, "Not found.");
  if (!response.ok) throw new ApiError(response.status, `Request failed (${response.status}).`);
  return response.json();
}

export const getUser = (name, options) => getJson(`/users/${encodeURIComponent(name)}`, options);
export const getRepos = (name, options) =>
  getJson(`/users/${encodeURIComponent(name)}/repos?sort=updated&per_page=5`, options);
```

- `encodeURIComponent` makes user input safe inside a URL.
- Turning every failure into one error type keeps the UI code simple.

Sending data uses the same function with options:

```js
await fetch("/api/notes", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ title: "Revise closures" }),
});
```

## UI states: loading, error, empty, success

Every screen that loads data has **four** states. Design all four, not just the happy one:

| State | What the user sees |
|---|---|
| loading | a spinner or "Loading…", and the search button disabled |
| error | a clear message ("User not found", "Network error, try again") and a retry option |
| empty | a helpful message ("This user has no public repositories") |
| success | the data |

```js
// main.js
import { getUser, ApiError } from "./api.js";

const statusEl = document.querySelector("#status");
const resultEl = document.querySelector("#result");
let controller;

async function search(name) {
  if (!name.trim()) return;
  controller?.abort();                       // cancel the previous request if still running
  controller = new AbortController();

  statusEl.textContent = "Loading…";
  resultEl.replaceChildren();
  try {
    const user = await getUser(name.trim(), { signal: controller.signal });
    statusEl.textContent = "";
    renderUser(user);                        // builds the card with textContent
  } catch (err) {
    if (err.name === "AbortError") return;   // a newer search replaced this one
    statusEl.textContent = err instanceof ApiError ? err.message : "Something went wrong.";
  }
}
```

`AbortController` solves a real bug: if the user searches "ann" and then "anna", the slower first response could
arrive last and overwrite the correct result. Aborting the old request prevents that.

### Rate limits and keys

Public APIs limit how many requests you can make. The GitHub REST API allows a limited number of unauthenticated
requests per hour per IP address, which is enough for development if you debounce your search box. Weather APIs
usually need a free API key. **Never commit a key to a public repository**; in a front-end-only app the key is visible
to anyone who opens DevTools anyway, so use only free, restricted keys and keep them in a `.env` file that is
listed in `.gitignore` (see S3).

## Lab: fetch with loading and error states

Build `week-11/fetch-lab/` with a single input and button that looks up a GitHub user:

- [ ] Shows "Loading…" and disables the button while waiting.
- [ ] Shows the avatar, name, bio and public repo count on success (with `textContent`, and `alt` on the image).
- [ ] Shows "User not found" for a 404 and a network message when offline (DevTools → Network → set throttling to
      **Offline** to test).
- [ ] Fetches the user and their latest five repositories **in parallel** with `Promise.all`.
- [ ] Before running it, write down the output order of the event-loop puzzle above, then check it.

## Check yourself

1. `fetch` returns a response with status 404. Does the promise reject? How should your code detect it?
2. Predict the output: `setTimeout(() => console.log(1)); Promise.resolve().then(() => console.log(2)); console.log(3);`
3. What problem does `AbortController` solve in a search box?
