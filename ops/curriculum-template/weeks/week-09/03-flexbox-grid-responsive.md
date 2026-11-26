---
type: notes
title: "W9 · S3 · Flexbox, CSS Grid and Mobile-First Responsive Design"
slug: w09-s3-flexbox-grid-responsive
topic: Flexbox, Grid & Responsive Design
subject: web-development
minutes: 35
description: Lay out pages with Flexbox (one dimension) and CSS Grid (two dimensions), then make them responsive with a mobile-first approach and media queries. Includes navbar, gallery and dashboard layouts.
---
# Flexbox, CSS Grid and responsive design

Layout used to mean floats and hacks. Today two tools cover almost everything:

- **Flexbox** arranges items in **one direction**: a row or a column (navbars, button groups, card content).
- **Grid** arranges items in **two directions** at once: rows and columns (galleries, page skeletons, dashboards).

They work together: a Grid page whose cells use Flexbox inside is completely normal.

## Flexbox

Set `display: flex` on the **container**; its direct children become **flex items**.

```css
.toolbar {
  display: flex;
  flex-direction: row;          /* row (default) | column */
  justify-content: space-between; /* along the main axis */
  align-items: center;          /* across the main axis */
  gap: 1rem;                    /* space between items */
  flex-wrap: wrap;              /* allow items to move to a new line */
}
```

The key idea is the **main axis**. With `flex-direction: row` it runs left to right, so `justify-content` controls
horizontal placement and `align-items` controls vertical placement. With `column`, the two swap.

| Property (container) | Common values |
|---|---|
| `justify-content` | `flex-start`, `center`, `flex-end`, `space-between`, `space-around`, `space-evenly` |
| `align-items` | `stretch` (default), `center`, `flex-start`, `flex-end`, `baseline` |
| `gap` | spacing between items, e.g. `1rem` |
| `flex-wrap` | `nowrap` (default), `wrap` |

On the **items**:

```css
.search  { flex: 1; }          /* grow to fill the remaining space */
.logo    { flex-shrink: 0; }   /* never squash the logo */
.push-right { margin-left: auto; } /* push this item (and those after it) to the end */
```

`flex: 1` is short for `flex-grow: 1; flex-shrink: 1; flex-basis: 0%`: share the free space equally.

### Centring anything

```css
.center {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
```

## CSS Grid

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
```

- `fr` means "a fraction of the free space". `1fr 2fr` gives the second column twice the width of the first.
- `repeat(3, 1fr)` is `1fr 1fr 1fr`.
- Items fill the cells in order; new rows are created automatically.

### The responsive gallery in one line

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}
```

`minmax(220px, 1fr)` says each column is at least 220px and at most an equal share. `auto-fill` fits as many columns
as the width allows. On a phone you get one column, on a laptop four or five, **with no media query at all**.

### Placing items and named areas

An item can span several tracks:

```css
.feature { grid-column: span 2; }       /* two columns wide */
.sidebar { grid-row: 1 / 3; }           /* from row line 1 to row line 3 */
```

For page skeletons, **named areas** read like a picture of the layout:

```css
.dashboard {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header  header"
    "sidebar main"
    "footer  footer";
  min-height: 100vh;
}
.dashboard > header { grid-area: header; }
.dashboard > nav    { grid-area: sidebar; }
.dashboard > main   { grid-area: main; }
.dashboard > footer { grid-area: footer; }
```

## Flexbox or Grid?

| Situation | Use |
|---|---|
| Items in a single row or column; sizes come from the content | Flexbox |
| A navbar, a row of buttons, a card's internal layout | Flexbox |
| Rows **and** columns must line up | Grid |
| A card gallery, a page skeleton, a dashboard | Grid |

## Responsive design

A responsive page adapts to any screen width. Three ingredients:

1. The **viewport meta tag** in the HTML head (from S1). Without it, phones pretend to be about 980px wide and
   shrink everything.
2. **Fluid sizes**: `%`, `fr`, `rem`, `max-width` instead of fixed pixel widths.
3. **Media queries** to change the layout at certain widths.

```css
img { max-width: 100%; height: auto; }   /* images never overflow their container */
.container { width: min(100% - 2rem, 1100px); margin-inline: auto; }
```

`min(100% - 2rem, 1100px)` gives a 1rem gutter on each side on phones and caps the width at 1100px on large screens.

### Mobile first

Write the **base styles for the smallest screen**, then add `min-width` media queries that enhance the layout as space
grows:

```css
/* Base: phones. One column. */
.projects { display: grid; gap: 1rem; }

/* Tablets and up */
@media (min-width: 640px) {
  .projects { grid-template-columns: repeat(2, 1fr); }
}

/* Laptops and up */
@media (min-width: 1024px) {
  .projects { grid-template-columns: repeat(3, 1fr); }
}
```

Why mobile first?

- Phone styles are usually the simplest (stacked content), so the base stays small.
- Each media query only **adds** layout, so you rarely fight earlier rules.
- Many of your users, recruiters included, will open your portfolio link on a phone.

Choose breakpoints where **your content** starts to look wrong, not for specific devices. The numbers above are
common starting points, not rules.

### Testing

In DevTools, click the **device toolbar** icon (Ctrl+Shift+M; Cmd+Shift+M on macOS) and drag the width. Check at
360px: if anything causes horizontal scrolling, find it (often a fixed `width`, a long URL, or an image without
`max-width: 100%`).

## Worked example: a responsive navbar

```html
<header class="site-header">
  <a class="logo" href="#">Asha Rao</a>
  <nav>
    <ul class="nav-links">
      <li><a href="#about">About</a></li>
      <li><a href="#projects">Projects</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>
  </nav>
</header>
```

```css
.site-header {
  display: flex;
  flex-direction: column;     /* phones: logo above links */
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
}
.nav-links {
  display: flex;
  gap: 1rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

@media (min-width: 640px) {
  .site-header {
    flex-direction: row;      /* wider screens: one row */
    justify-content: space-between;
  }
}
```

No JavaScript is needed for a three-link navbar. A hamburger menu needs JavaScript, which arrives next week.

## Lab: layout challenges

Build each in its own HTML file inside `week-09/layouts/`:

- [ ] **Navbar**: logo left, links right on wide screens; stacked on phones (the worked example, then restyle it).
- [ ] **Gallery**: 12 cards using `repeat(auto-fill, minmax(220px, 1fr))`. Resize from 360px to 1400px and watch the
      columns change.
- [ ] **Dashboard grid**: header, sidebar, main and footer with `grid-template-areas`. On phones (base styles) stack
      everything in one column; from 768px use the two-column layout. Inside `main`, place four stat cards in a
      grid where the first card spans two columns.
- [ ] Every page has no horizontal scroll at 360px.

## Check yourself

1. With `flex-direction: column`, which property centres items horizontally: `justify-content` or `align-items`?
2. What does `grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))` do as the screen gets wider?
3. In a mobile-first stylesheet, do your media queries use `min-width` or `max-width`? Why?
