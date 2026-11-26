---
type: resource
title: "W10 · Cheat Sheet: JavaScript, Array Methods, the DOM and Backtracking"
slug: w10-cheat-sheet
topic: Week 10 Reference
subject: web-development
minutes: 10
description: One-page reference for Week 10 — JavaScript syntax and equality, array methods, destructuring and spread, DOM selection, events and delegation, localStorage, the backtracking template, and this week's tasks.
---
# Week 10 cheat sheet

## JavaScript essentials

```js
const x = 5;            // default choice
let count = 0;          // only when it must change; never var
`Hi ${name}`            // template literal
a === b   a !== b       // always strict equality
value ?? "default"      // only null/undefined fall back (0 and "" are kept)
obj?.profile?.city      // optional chaining: undefined instead of a TypeError
const sq = (n) => n * n;
Math.floor(7 / 2)       // 3 (no // operator)
```

Falsy: `false 0 -0 0n "" null undefined NaN`. Truthy: everything else, **including `[]` and `{}`**.

| Expression | Result |
|---|---|
| `"5" + 3` | `"53"` |
| `"5" - 3` | `2` |
| `"5" == 5` / `"5" === 5` | `true` / `false` |
| `typeof null` | `"object"` |
| `NaN === NaN` | `false` (use `Number.isNaN`) |
| `[10, 9, 1].sort()` | `[1, 10, 9]` |

## Arrays and objects

```js
arr.map((x) => x * 2)              // transform → new array, same length
arr.filter((x) => x > 0)           // keep matches → new array
arr.find((x) => x.id === 3)        // first match or undefined
arr.reduce((acc, x) => acc + x, 0) // fold to one value; always give a start value
arr.some(fn)  arr.every(fn)        // true / false
[...arr].sort((a, b) => a - b)     // numeric sort on a copy (sort mutates)
arr.at(-1)                         // last item

const { name, cgpa: score = 0 } = student;    // destructure, rename, default
const [first, ...rest] = list;                // rest
const copy = { ...student, cgpa: 8.6 };        // spread (shallow copy)
JSON.stringify(obj)   JSON.parse(text)
```

## DOM

```js
document.querySelector("#id .class")       // first match or null
document.querySelectorAll("li")            // NodeList (spread into an array to map)
el.textContent = userText                  // safe for user input; avoid innerHTML with it
el.classList.add / remove / toggle("done")
el.dataset.id                              // data-id attribute
document.createElement("li");  parent.append(child);  el.remove();  parent.replaceChildren();

form.addEventListener("submit", (e) => { e.preventDefault(); /* ... */ });

list.addEventListener("click", (e) => {    // event delegation: one listener
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
});

localStorage.setItem(KEY, JSON.stringify(data));
const data = JSON.parse(localStorage.getItem(KEY)) ?? [];
```

App pattern: **change state → save() → render()**.

## Backtracking

```python
def dfs(start, path):
    if done(path):
        result.append(path[:])   # append a COPY
        return
    for i in range(start, len(choices)):
        path.append(choices[i])  # choose
        dfs(i + 1, path)         # explore (i to allow reuse)
        path.pop()               # undo
```

Subsets 2^n · permutations n! · always draw the recursion tree first.

## This week

| Item | Details |
|---|---|
| **Deliverable** | Deployed To-do or Quiz app (Weekly Build WB-10), linked from your portfolio |
| **Practice quiz** | JavaScript Fundamentals & the DOM (untimed, retakes allowed) |
| **Weekly test** | 15 questions on JavaScript, array methods, the DOM and backtracking, 25 minutes |
| **DSA** | Power and factorial warm-ups, Subsets, Permutations, Combination Sum, Generate Parentheses |
| **Career task** | Add the JS app to your portfolio site with a short description |
