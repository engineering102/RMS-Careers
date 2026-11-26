---
type: notes
title: "W13 · S3 · API Integration: Env Variables, Loading, Error and Empty States, Pagination"
slug: w13-s3-api-integration-patterns
topic: React and REST APIs
subject: web-development
minutes: 40
description: Talking to a REST API from React the professional way: a mock API with json-server, an API module, Vite environment variables, a useFetch hook with loading, error and empty states, cancelling requests, and load-more pagination.
---
# API integration patterns in React

Real apps get their data from an API, and APIs are slow, sometimes down, and sometimes return nothing. The difference
between a student project and a professional one is mostly in how those three situations are handled. This session
connects your multi-page app to a REST API and handles every state properly.

## A mock REST API in one minute: json-server

Before you build your own back end (Week 14), you can fake one. **json-server** turns a JSON file into a REST API. Create `db.json` in the project root:

```json
{
  "items": [
    { "id": 1, "title": "Engineering Mathematics (Vol 1)", "category": "books", "price": 350, "condition": "good" },
    { "id": 2, "title": "Scientific calculator", "category": "calculators", "price": 600, "condition": "like new" },
    { "id": 3, "title": "Lab coat (M)", "category": "lab-coats", "price": 200, "condition": "fair" }
  ]
}
```

```bash
npm install --save-dev json-server@0.17.4
```

Add a script to `package.json` and run it in a second terminal:

```json
"scripts": {
  "dev": "vite",
  "api": "json-server --watch db.json --port 3001"
}
```

```bash
npm run api
```

You now have a real HTTP API. We pin version 0.17.4 because newer major versions changed the query parameters used
below.

| Request | Meaning |
|---|---|
| `GET /items` | all items |
| `GET /items/2` | one item (404 if missing) |
| `GET /items?category=books` | filter by a field |
| `GET /items?q=calc` | full-text search |
| `GET /items?_page=2&_limit=6` | page 2, six per page |
| `POST /items` | create (JSON body) |
| `PATCH /items/2` | update some fields |
| `DELETE /items/2` | delete |

Open `http://localhost:3001/items` in the browser to check it works before writing any React.

## Environment variables in Vite

The API address differs between your laptop (`http://localhost:3001`) and production (Week 15). Never hard-code it.
Vite reads `.env` files in the project root and exposes variables that start with `VITE_`:

```bash
# .env.development
VITE_API_URL=http://localhost:3001
```

```js
const API_URL = import.meta.env.VITE_API_URL;
```

Facts to remember:

- Only `VITE_`-prefixed variables reach browser code. Others are ignored on purpose.
- They are baked into the JavaScript **at build time**, and anyone can read them in DevTools. **Never put a secret
  (API key with billing, database password) in front-end env variables.** Secrets live on the server.
- Restart `npm run dev` after editing a `.env` file.
- Commit a `.env.example` listing the variable names with placeholder values; keep `.env.local` out of Git.

## One module for all API calls

Do not scatter `fetch` calls through components. Put them in one file so the base URL, headers and error handling
live in one place.

```js
// src/api/client.js
const API_URL = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function apiGet(path, { signal } = {}) {
  const res = await fetch(`${API_URL}${path}`, { signal });
  if (!res.ok) {
    throw new ApiError(res.status, `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const getItems = (params, opts) => apiGet(`/items?${new URLSearchParams(params)}`, opts);
export const getItem = (id, opts) => apiGet(`/items/${id}`, opts);
```

Remember from Week 11: `fetch` only rejects on a **network** failure. A 404 or 500 still resolves, so you must check
`res.ok` yourself.

### fetch or axios?

**axios** is a popular library that throws on non-2xx statuses automatically, parses JSON for you and supports
interceptors (for example, attaching a token to every request). `fetch` is built into browsers and Node, with no
dependency. Both are fine; with a small wrapper like the one above, `fetch` is enough for this programme.

## The four states of every request

Every screen that fetches data is in exactly one of these states. Design all four.

| State | What the user should see |
|---|---|
| **Loading** | A spinner or skeleton, so the page does not look broken |
| **Error** | A clear message and a "Try again" button; not a blank page or a console error |
| **Empty** | A friendly message ("No items match 'xyz'") and a next step ("Clear filters") |
| **Success** | The data |

A reusable hook keeps this logic out of your components:

```js
// src/hooks/useFetch.js
import { useCallback, useEffect, useState } from 'react';

export function useFetch(fetcher, deps) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetcher({ signal: controller.signal })
      .then((result) => setData(result))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();   // cancel if deps change or the component unmounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, error, loading, retry };
}
```

Why the `AbortController`? If the user types "cal", then "calc", two requests are in flight. Without cancelling,
the slower first response can arrive last and overwrite the correct results: a **race condition**. Aborting the old
request on every change prevents it.

In development, React's `StrictMode` runs every effect twice (mount, unmount, mount) to help you find missing
cleanups. Seeing two requests in the Network tab during development is expected; the cleanup cancels the first.

Using the hook on the details page:

```jsx
import { useParams, Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { getItem } from '../api/client.js';

export default function ItemDetails() {
  const { id } = useParams();
  const { data: item, error, loading, retry } = useFetch((opts) => getItem(id, opts), [id]);

  if (loading) return <p role="status">Loading item…</p>;
  if (error?.status === 404) return <p>That item does not exist. <Link to="/">Back to catalogue</Link></p>;
  if (error) return (
    <div role="alert">
      <p>Could not load the item. Check your connection.</p>
      <button onClick={retry}>Try again</button>
    </div>
  );
  return <h1>{item.title} · ₹{item.price}</h1>;
}
```

Order matters: check `loading`, then `error`, then empty, then render data. `role="status"` and `role="alert"` let
screen readers announce the change.

## Pagination: "load more"

Loading 5,000 items at once is slow for the server and the user. Ask for one **page** at a time. With json-server
0.17 that is `?_page=N&_limit=M`.

```jsx
const PAGE_SIZE = 6;

function Catalogue() {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getItems({ _page: page, _limit: PAGE_SIZE }, { signal: controller.signal })
      .then((batch) => {
        setItems((prev) => (page === 1 ? batch : [...prev, ...batch]));
        setHasMore(batch.length === PAGE_SIZE);   // a short page means it was the last one
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [page]);

  // render items, then:
  // {hasMore && <button disabled={loading} onClick={() => setPage((p) => p + 1)}>Load more</button>}
}
```

| Style | How it works | Good for |
|---|---|---|
| Numbered pages | `?_page=3`; jump to any page | Admin tables, search results |
| Load more / infinite scroll | Append the next page to the list | Feeds, catalogues |
| Cursor-based | "Give me 20 items after id 980" | Large or fast-changing data (common in real APIs) |

When a filter changes, reset `page` to 1 and clear the list, or you will append books to calculators.

## Lab: connect to a mock REST API

1. Create `db.json` with at least 20 marketplace items and run json-server on port 3001 with an `api` script.
2. Add `VITE_API_URL` to `.env.development` and a `.env.example`; read it in `src/api/client.js`.
3. Write `useFetch` (or a more specific `useItems`) with loading, error and retry.
4. Replace the local JSON import on the catalogue and details pages with API calls.
5. Test each state on purpose: stop json-server (error), search for nonsense (empty), throttle the network to
   "Slow 3G" in DevTools (loading), open `/items/9999` (404).
6. Add "Load more" pagination with six items per page.
7. Stretch: make the `/sell` form `POST` a new item, then navigate to its details page.

## Check yourself

1. `fetch('/items/9999')` returns a 404. Does the promise reject? What must your code do?
2. Why is it unsafe to put a payment provider's secret key in `VITE_PAYMENT_KEY`?
3. Without an `AbortController`, describe a sequence of typing and responses that shows the wrong search results.
