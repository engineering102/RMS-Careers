---
type: resource
title: "W12 · Cheat Sheet: React Components, State, Effects and Stacks"
slug: w12-cheat-sheet
topic: Week 12 Reference
subject: web-development
minutes: 10
description: One-page reference for Week 12 — Vite React setup, JSX rules, props and children, useState and immutable updates, lists and keys, controlled forms, useEffect, lifting state up, styling options, stacks and queues, and this week's tasks.
---
# Week 12 cheat sheet

## Setup

```bash
npm create vite@latest campus-marketplace -- --template react
cd campus-marketplace && npm install && npm run dev
```

## JSX

`className` · `htmlFor` · close every tag (`<img />`) · one parent or `<>...</>` · `{expression}` · camelCase events
(`onClick`) · `style={{ marginTop: 8 }}` · component names start with a capital letter.

## Components, props, state

```jsx
function ItemCard({ item, onAdd }) {              // props: read-only inputs
  return <button type="button" onClick={() => onAdd(item.id)}>{item.title}</button>;
}

const [count, setCount] = useState(0);
setCount((c) => c + 1);                           // updater when the new value depends on the old

setItems([...items, newItem]);                    // add       (never push)
setItems(items.filter((i) => i.id !== id));       // remove
setItems(items.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)));   // change one
setForm((f) => ({ ...f, [e.target.name]: e.target.value }));              // controlled form field

{list.length > 0 && <List />}                     // not {list.length && ...} (renders 0)
{items.map((item) => <ItemCard key={item.id} item={item} onAdd={add} />)}   // stable id keys
```

Hooks: top level only, only in components or custom hooks. Derive values (filtered, sorted, totals) during render;
do not store them in state.

## useEffect

```jsx
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal })
    .then((res) => { if (!res.ok) throw new Error(res.status); return res.json(); })
    .then(setData)
    .catch((err) => { if (err.name !== "AbortError") setError(err); });
  return () => controller.abort();                // cleanup
}, [url]);                                        // re-run when url changes
```

| Deps | Runs |
|---|---|
| `[a, b]` | after mount and when `a` or `b` changes |
| `[]` | once after mount |
| none | after every render |

StrictMode runs effects twice in development: add cleanups.

## Lifting state up

State lives in the **lowest common parent** of the components that need it. Pass the value down as a prop and a
callback (`onChange`) down so the child can ask the parent to change it.

## Styling

CSS Modules: `import styles from "./Card.module.css"` → `className={styles.card}` (scoped names).
Tailwind v4 + Vite: `npm install tailwindcss @tailwindcss/vite`, add `tailwindcss()` to plugins, `@import "tailwindcss";`.

## Stacks and queues

```python
stack = []; stack.append(x); stack.pop(); stack[-1]       # check `if stack` before popping
from collections import deque
q = deque(); q.append(x); q.popleft()                     # O(1); list.pop(0) is O(n)
```

Matching brackets, undo, evaluate → stack. "Next warmer / greater" → monotonic stack of **indices**.

## This week

| Item | Details |
|---|---|
| **Deliverable** | React catalogue app repository (Weekly Build WB-12 · Campus Marketplace 1/3: Catalogue) |
| **Practice quiz** | React Fundamentals (untimed, retakes allowed) |
| **Weekly test** | 15 questions on React components, props, state, effects and stacks, 25 minutes |
| **DSA** | Valid Parentheses, Min Stack, Implement Queue using Stacks, Evaluate Reverse Polish Notation, Daily Temperatures |
| **Career task** | Publish one LinkedIn post about a project built so far (what, how, what you learned) |
