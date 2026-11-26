---
type: notes
title: "W24 · S1 · Build Sprint: Feature Work, Integration and Pair Programming"
slug: w24-s1-feature-work-integration-pairing
topic: Team Development
subject: dev-tools
minutes: 30
description: Deliver must-have features against the board, connect front end, back end and database cleanly, keep branches in sync with main, resolve merge conflicts, and use pair programming to clear blockers.
---
# Build sprint: feature work, integration and pair programming

Sprint 2 has one goal: **every must-have feature merged to `main` by the end of the week**. This session is about
working fast without breaking each other's code.

## Work from the board, not from memory

At the start of each work block:

1. Open the board, filter by **your name** and the **Sprint 2** milestone.
2. Pick the highest-priority card in *Todo*, move it to *In progress*, and re-read its acceptance criteria.
3. Create a branch named after the issue: `feat/18-coordinator-dashboard`.

If a task is bigger than expected, **split the issue** (for example "dashboard: drive-wise counts" and "dashboard:
branch-wise chart") rather than letting one card sit in *In progress* all week.

## Keeping your branch in sync

`main` moves while you work. Bring its changes into your branch at least once a day, so conflicts stay small:

```bash
git switch main
git pull
git switch feat/18-coordinator-dashboard
git merge main            # or: git rebase main (only for branches nobody else uses)
```

### Resolving a merge conflict

Git stops and marks the conflicting part of the file:

```text
<<<<<<< HEAD
const API_BASE = import.meta.env.VITE_API_URL;
=======
const API_BASE = 'http://localhost:4000';
>>>>>>> main
```

1. Decide what the final code should be. Often it is a combination, not one side.
2. Delete the markers (`<<<<<<<`, `=======`, `>>>>>>>`) and save.
3. Run the app and the tests.
4. `git add <file>` then `git commit` to finish the merge.

If you are not sure which version is right, ask the person who wrote the other side. Never resolve a conflict by
blindly accepting "mine" for every file.

## Integration: connecting the layers

Integration bugs are the most common reason a capstone demo fails. Most come from four sources.

**1. The API base URL.** Hard-coding `http://localhost:4000` works until deployment. Read it from configuration:

```js
// client/src/api.js
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed with status ${res.status}`);
  }
  return data;
}
```

Every screen now calls `api('/api/drives', { token })` and handles errors in one consistent way.

**2. CORS.** A browser blocks a page on one origin from reading responses from another origin unless the server allows
it. Allow only your own front end:

```js
import cors from 'cors';

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
```

**3. Field names drifting from the contract.** The API returns `min_cgpa`; the React component reads `minCgpa`; the
screen shows `undefined`. Fix the contract in `docs/api-contract.md` first, then the code. Pick one convention (camelCase
in JSON is common) and convert at the database boundary.

**4. Silent failures.** A `fetch` that fails without a message looks like "the button does nothing". Every screen needs
three states: **loading**, **error** (with the message) and **empty** ("No drives match your profile yet").

### Data and AI projects

The same ideas apply: the Streamlit or FastAPI layer reads the database URL and any API keys from environment
variables; the model is loaded once at start-up, not on every request; and every external call (LLM, embeddings) has a
timeout and an error message the user can understand.

## Pair programming on blockers

When someone has been stuck for more than half a day, pair with them for 30–60 minutes.

| Role | Does |
|---|---|
| **Driver** | Types, and says out loud what they are doing |
| **Navigator** | Reads ahead, spots mistakes, thinks about the next step and edge cases |

Swap roles every 15–20 minutes. The person who owns the feature should drive at least half the time; the goal is to
unblock them, not to take the feature away. Use the editor's live-share features or simply share a screen.

When pairing, look at evidence before guessing:

- Read the **full error message** and the line it points to.
- Check the **Network** tab in the browser's developer tools: which URL was called, what status came back, what the
  response body says.
- Add a temporary `console.log` or `print` at each layer to find where the data stops being correct.

Pair commits can credit both people with a trailer in the commit message:

```text
Add branch-wise chart to coordinator dashboard

Co-authored-by: Ravi Kumar <ravi@example.com>
```

## Ownership is visible

Your tutor checks the commit history **per student** this week. Make your work visible:

- Commit under your own Git identity, from your own machine.
- Open PRs for your own features, and review others' PRs.
- Keep your board cards up to date.

If a teammate is not contributing, raise it early with them, then with the tutor. Waiting until Week 26 helps nobody.

## Lab: feature work

1. Pull the latest `main` into your branch and resolve any conflicts.
2. Move your Sprint 2 card to *In progress* and build the feature as a vertical slice.
3. Add loading, error and empty states to its screen.
4. Open a PR with `Closes #<issue>`; request a review.
5. Spend at least 30 minutes pairing: either helping a blocked teammate or being helped.

## Check yourself

1. Your feature works locally but shows "Failed to fetch" in the browser, and the console mentions CORS. What is the
   likely cause, and where is it fixed?
2. Why is merging `main` into your branch every day better than once at the end of the week?
3. In pair programming, what does the navigator do while the driver types?
