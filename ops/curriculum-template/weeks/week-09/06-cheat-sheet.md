---
type: resource
title: "W9 · Cheat Sheet: HTTP, HTML5, CSS Layout and Binary Search"
slug: w09-cheat-sheet
topic: Week 9 Reference
subject: web-development
minutes: 10
description: One-page reference for Week 9 — HTTP methods and status codes, semantic HTML, specificity and the box model, Flexbox and Grid, media queries, GitHub Pages, binary search, and this week's tasks.
---
# Week 9 cheat sheet

## HTTP

`GET` read · `POST` create · `PUT` replace · `PATCH` partial update · `DELETE` remove

| Code | Meaning |
|---|---|
| 200 / 201 / 204 | OK / Created / No Content |
| 301 / 302 / 304 | Moved permanently / Found (temporary redirect) / Not Modified |
| 400 / 401 / 403 / 404 | Bad request / Not logged in / Not allowed / Not found |
| 500 / 503 | Server error / Unavailable |

URL → **DNS** (name to IP) → **TCP + TLS** (port 443) → **request** → **response** → browser parses HTML and requests
CSS, JS and images.

## Semantic HTML

`header` · `nav` · `main` (one) · `section` · `article` · `aside` · `footer` · one `h1`, no skipped heading levels.

```html
<label for="email">Email</label>
<input id="email" name="email" type="email" required>
<img src="me.jpg" alt="Asha presenting her project">
```

## CSS

Specificity `(id, class, element)`: `#a` (1,0,0) > `.b .c` (0,2,0) > `div p` (0,0,2). Equal → later rule wins.

```css
*, *::before, *::after { box-sizing: border-box; }   /* width includes padding + border */
:root { --primary: #0f766e; --space: 1rem; }
.btn { background: var(--primary); padding: var(--space); }
:focus-visible { outline: 3px solid var(--primary); }
```

| Unit | Relative to |
|---|---|
| `rem` | root font size (usually 16px) |
| `em` | this element's font size |
| `%` | parent |
| `vh` / `vw` | 1% of viewport height / width |

## Layout

```css
.row  { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
.center { display: grid; place-items: center; }

/* mobile first: base = phone, then add */
@media (min-width: 640px)  { .cards { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .cards { grid-template-columns: repeat(3, 1fr); } }
```

Flexbox = one direction. Grid = rows and columns. Always: `<meta name="viewport" content="width=device-width, initial-scale=1">`
and `img { max-width: 100%; height: auto; }`.

## GitHub Pages

Repo → Settings → Pages → Deploy from a branch → `main` / `(root)` → Save. URL: `https://<you>.github.io/<repo>/`.
Entry file `index.html`; relative paths; file names are case-sensitive.

## Binary search

```python
def first_true(lo, hi, ok):          # smallest x in [lo, hi] with ok(x); hi + 1 if none
    hi += 1
    while lo < hi:
        mid = (lo + hi) // 2
        if ok(mid): hi = mid
        else: lo = mid + 1
    return lo
```

Sorted input or a "minimum value such that…" question → binary search. O(log n).

## This week

| Item | Details |
|---|---|
| **Deliverable** | Live portfolio URL + repository (Weekly Build WB-09 · Portfolio v1) |
| **Practice quiz** | How the Web Works, HTML5 & CSS3 (untimed, retakes allowed) |
| **Weekly test** | 15 questions on HTTP, HTML, CSS and binary search, 25 minutes |
| **DSA** | Binary Search, Search Insert Position, Find First and Last Position, Search in Rotated Sorted Array, Koko Eating Bananas |
| **Career task** | Portfolio website live on GitHub Pages (it will be upgraded in later phases) |
