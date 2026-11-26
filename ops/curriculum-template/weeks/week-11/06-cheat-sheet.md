---
type: resource
title: "W11 · Cheat Sheet: Closures, this, Async, fetch, Tooling and Linked Lists"
slug: w11-cheat-sheet
topic: Week 11 Reference
subject: web-development
minutes: 10
description: One-page reference for Week 11 — scope and hoisting, closures and this, promises and the event loop, a safe fetch pattern, npm and Vite commands, ESLint and Prettier, the PR workflow, linked list techniques, and this week's tasks.
---
# Week 11 cheat sheet

## Scope, hoisting, closures, this

| Before its line | Behaviour |
|---|---|
| `function f() {}` | callable |
| `var x` | `undefined` |
| `let` / `const` / `class` | `ReferenceError` (temporal dead zone) |

```js
function debounce(fn, delay = 400) {      // closure over timerId
  let timerId;
  return (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn(...args), delay);
  };
}
```

`this`: `obj.m()` → `obj` · plain `f()` → `undefined` (strict) · `new F()` → new object · `f.bind(x)` → `x` ·
arrow function → the surrounding `this`. Passing `obj.m` as a callback loses `this`: use `() => obj.m()`.

`for (var i…) setTimeout(() => log(i))` → 3 3 3 · with `let` → 0 1 2.

## Async

```js
async function load(name) {
  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error(res.status === 404 ? "Not found" : `HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    // network failure OR the error thrown above
    throw err;
  }
}
const [a, b] = await Promise.all([p1, p2]);   // parallel
```

- `fetch` rejects **only on network failure**; check `res.ok` for 4xx/5xx.
- Order: synchronous code → **all microtasks** (`then`, code after `await`) → **one task** (`setTimeout`, events) → repeat.
- `A; setTimeout(B); Promise.then(C); D` prints **A D C B**.
- Every data screen has four states: loading, error, empty, success.
- `AbortController` cancels an outdated request.

## Tooling

```bash
npm create vite@latest my-app -- --template vanilla
npm install          npm install -D eslint @eslint/js globals prettier
npm run dev          npm run build  (→ dist/)   npm run preview
npm run lint         npx eslint . --fix          npx prettier . --write
```

Commit `package.json` and `package-lock.json`; ignore `node_modules`, `dist`, `.env.local`.
`VITE_*` variables are visible in the browser: never put a secret in them. GitHub Pages needs `base: "/<repo>/"`.

## Team PR workflow

```bash
git switch main && git pull
git switch -c feature/thing
git commit -m "Add thing"   →   git push -u origin feature/thing   →   open PR → review → merge → delete branch
git pull origin main        # on your branch, to resolve a conflict locally
```

## Linked lists

```python
prev, curr = None, head            # reverse
while curr:
    nxt = curr.next; curr.next = prev; prev = curr; curr = nxt

slow = fast = head                 # middle / cycle
while fast and fast.next:
    slow, fast = slow.next, fast.next.next

dummy = ListNode(0, head)          # when the head may change; return dummy.next
```

Save `next` before changing it. Test empty, one node, two nodes.

## This week

| Item | Details |
|---|---|
| **Deliverable** | API app repository (Weekly Build WB-11 · API Explorer, team build) + LinkedIn profile URL in the tracker |
| **Practice quiz** | Advanced JavaScript, Async & Tooling (untimed, retakes allowed) |
| **Weekly test** | 15 questions on closures, `this`, async JavaScript, tooling and linked lists, 25 minutes |
| **DSA** | Reverse Linked List, Merge Two Sorted Lists, Linked List Cycle, Middle of the Linked List, Remove Nth Node From End |
| **Career task** | LinkedIn profile: photo, headline, About, skills, Featured section with your portfolio link |
