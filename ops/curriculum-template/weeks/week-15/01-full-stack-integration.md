---
type: notes
title: "W15 · S1 · Full Stack Integration: React Meets Your Express API"
slug: w15-s1-full-stack-integration
topic: Full Stack Integration
subject: web-development
minutes: 40
description: Connecting the Week 13 React client to the Week 14 Express API, a shared API client that sends the token, an auth flow from login to logout, CORS and the Vite dev proxy, showing server validation errors, and environment-specific configuration.
---
# Full stack integration: React meets your Express API

You have a React client (Week 13) that talks to json-server, and an Express API (Week 14) with a real database and
authentication. This session joins them so a user can sign up, log in and change real data from the browser.

## Repository layout

Keep both halves in one repository so a feature can change UI and API in a single pull request:

```text
campus-marketplace/
  client/            Vite + React (Week 13)
    .env.development
    .env.example
  server/            Express + PostgreSQL (Week 14)
    .env             (ignored)
    .env.example
  .github/workflows/ (Session 2)
  README.md
```

During development run two terminals: `npm run dev` in `server/` (port 4000) and `npm run dev` in `client/`
(port 5173).

## Two ways to reach the API in development

### Option 1: CORS

The client calls `http://localhost:4000` directly. The browser sees a different origin, so the server must allow it:

```js
// server/src/app.js
const allowed = (process.env.CLIENT_ORIGIN ?? '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: allowed }));
```

```bash
# server/.env
CLIENT_ORIGIN=http://localhost:5173
```

A comma-separated list lets production allow both your Vercel URL and a custom domain later.

### Option 2: the Vite dev proxy

Vite can forward requests from the dev server to your API, so the browser only ever talks to `localhost:5173` and
CORS never comes up in development:

```js
// client/vite.config.js
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
```

With the proxy, the client calls relative URLs such as `/api/v1/items`. The proxy exists **only** in `vite dev`;
the production build still needs either CORS or the same domain for both halves. Most teams deploying the client and
API to different hosts use Option 1 everywhere, so development behaves like production. We use Option 1.

## One API client for the whole app

Extend the Week 13 `client.js` so every request sends JSON, attaches the token and turns error responses into
useful exceptions.

```js
// client/src/api/client.js
const API_URL = import.meta.env.VITE_API_URL;      // http://localhost:4000 in development

let authToken = null;
export const setAuthToken = (token) => { authToken = token; };

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Cannot reach the server. Check your connection.');
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`, data?.details);
  }
  return data;
}
```

The error shape matches the server's central error handler from Week 14 (`{ error, details }`), so validation
messages can reach the form fields. Consistency between the two halves is the whole point of a contract.

## The auth flow end to end

```text
1. Login form  ──POST /auth/login {email, password}──▶  API checks bcrypt hash
2.             ◀──────── 200 { token, user } ─────────   signs a JWT
3. Client stores the token, sets it on the API client, puts user in AuthContext
4. Every request: Authorization: Bearer <token>  ──▶  requireAuth verifies it
5. On reload: read stored token ──GET /auth/me──▶ restore user (or clear if 401)
6. Logout: forget the token and user; a later 401 also logs the user out
```

```jsx
// client/src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { api, setAuthToken } from '../api/client.js';

const AuthContext = createContext(null);
const TOKEN_KEY = 'cm_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);   // true until we know if a stored token is valid

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (!saved) {
      setChecking(false);
      return;
    }
    setAuthToken(saved);
    api('/api/v1/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setAuthToken(null);
      })
      .finally(() => setChecking(false));
  }, []);

  async function login(email, password) {
    const { token, user } = await api('/api/v1/auth/login', { method: 'POST', body: { email, password } });
    localStorage.setItem(TOKEN_KEY, token);
    setAuthToken(token);
    setUser(user);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, checking, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

Update `ProtectedRoute` from Week 13 so it waits while `checking` is true; otherwise a logged-in user who refreshes
`/sell` is redirected to `/login` before `/auth/me` has answered.

```jsx
if (checking) return <p role="status">Checking your session…</p>;
if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
```

**About `localStorage`.** Any script running on your page can read it, so a cross-site scripting (XSS) bug could
steal the token. The alternative is an `httpOnly` cookie set by the server, which JavaScript cannot read; across two
different domains (for example a Vercel client and a Render API) that needs `SameSite=None; Secure` cookies,
`credentials: true` in CORS and `credentials: 'include'` in `fetch`, and some browsers restrict such cross-site
cookies. For MP3, a short-lived token in `localStorage` is acceptable **if** you never render user input as raw HTML.
Know the trade-off; interviewers ask about it.

## Using the API in components

```jsx
// client/src/pages/SellForm.jsx (core of the submit handler)
const [errors, setErrors] = useState({});
const [formError, setFormError] = useState(null);
const [saving, setSaving] = useState(false);

async function handleSubmit(event) {
  event.preventDefault();
  setSaving(true);
  setErrors({});
  setFormError(null);
  try {
    const item = await api('/api/v1/items', { method: 'POST', body: form });
    navigate(`/items/${item.id}`);
  } catch (err) {
    if (err.status === 400 && err.details) {
      // [{ path: 'price', message: '...' }] → { price: '...' }
      setErrors(Object.fromEntries(err.details.map((d) => [d.path, d.message])));
    } else if (err.status === 401) {
      logout();
      navigate('/login', { state: { from: '/sell' } });
    } else {
      setFormError(err.message);
    }
  } finally {
    setSaving(false);
  }
}
```

Validate on **both** sides. Client-side validation (required fields, `min`, `type="email"`) gives instant feedback;
server-side validation is the one that counts, because anyone can bypass the browser. Disable the submit button while
`saving` so a double click does not create two items.

## Environment-specific configuration

| Setting | Development | Production | Where it lives |
|---|---|---|---|
| `VITE_API_URL` | `http://localhost:4000` | `https://your-api.onrender.com` | `client/.env.development`, host dashboard |
| `CLIENT_ORIGIN` | `http://localhost:5173` | `https://your-app.vercel.app` | `server/.env`, host dashboard |
| `DATABASE_URL` | local PostgreSQL | managed PostgreSQL (Neon / Supabase) | `server/.env`, host dashboard |
| `JWT_SECRET` | any long random string | a **different** long random string | `server/.env`, host dashboard |

Vite loads `.env.development` for `vite dev` and `.env.production` for `vite build`; values set in the hosting
dashboard at build time override them. Production secrets are typed into the hosting dashboard, never committed.

## Lab: connect the Week 13 app to the Week 14 API

1. Move both projects into one repository as `client/` and `server/` (keep their Git history if you can, or start
   a fresh repo and copy).
2. Replace json-server calls with the shared `api()` client; set `VITE_API_URL` and `CLIENT_ORIGIN`.
3. Add signup and login pages wired to the API; build `AuthProvider` with token restore via `/auth/me`.
4. Make the `/sell` form create a real item, showing server validation errors beside the fields.
5. Show edit and delete buttons only to the item's seller, and confirm the API still returns 403 if you call it
   directly as another user.
6. Test the unhappy paths: stop the server (network error message), use an expired or edited token (logged out),
   submit an empty form (field errors).

## Check yourself

1. The Vite dev proxy makes your API calls work locally, but the deployed site shows CORS errors. Why?
2. Why does `ProtectedRoute` need a `checking` state once tokens are restored from storage?
3. The edit button is hidden for non-sellers. Why must the API still check ownership?
