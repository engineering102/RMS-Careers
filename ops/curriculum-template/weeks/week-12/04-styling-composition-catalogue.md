---
type: notes
title: "W12 · S4 · Styling React (CSS Modules, Tailwind), Composition and the Catalogue Build"
slug: w12-s4-styling-composition-catalogue
topic: React Styling & Catalogue Build
subject: web-development
minutes: 40
description: Compare ways to style React components (CSS Modules and Tailwind CSS), use composition patterns such as children and specialised components, and build the Campus Marketplace catalogue with filter, sort and a cart count.
---
# Styling React, composition and the catalogue build

Today you start the **Campus Marketplace**, the project you will grow over the next three weeks: a React catalogue
this week, a multi-page app in Week 13, and a REST API back end in Week 14. This session covers the two decisions
you make first: **how to style** components, and **how to compose** them.

## Styling options

| Option | How | Strengths | Watch out for |
|---|---|---|---|
| One global CSS file | `import "./index.css"` | simple, what you know from Week 9 | class names clash as the app grows |
| **CSS Modules** | `Card.module.css`, `styles.card` | normal CSS, class names scoped to one component | one more file per component |
| **Tailwind CSS** | utility classes in JSX: `className="p-4 rounded-lg"` | very fast to build with, consistent spacing and colours | long class lists; learn the naming first |
| Inline `style={{ }}` | a JavaScript object | dynamic values (a width from data) | no hover, media queries or reuse |

For WB-12 choose **CSS Modules or Tailwind**. Both are used widely in industry, and your Week 9 CSS knowledge
transfers to both.

### CSS Modules

Vite supports CSS Modules with no setup. Any file ending in `.module.css` is a module:

```css
/* src/components/ItemCard.module.css */
.card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.price {
  font-weight: 700;
}

.soldOut {
  opacity: 0.5;
}
```

```jsx
// src/components/ItemCard.jsx
import styles from "./ItemCard.module.css";

export default function ItemCard({ item, onAdd }) {
  const { title, price, condition, image, sold } = item;
  return (
    <article className={sold ? `${styles.card} ${styles.soldOut}` : styles.card}>
      <img src={image} alt={title} loading="lazy" />
      <h3>{title}</h3>
      <p className={styles.price}>₹{price.toLocaleString("en-IN")}</p>
      <p>{condition}</p>
      <button type="button" onClick={() => onAdd(item.id)} disabled={sold}>
        Add to cart
      </button>
    </article>
  );
}
```

At build time `.card` becomes a unique name such as `_card_x7f2a_1`, so another component's `.card` can never clash
with it. Keep site-wide things (CSS variables, the box-sizing reset, body typography) in the global `index.css`.

### Tailwind CSS

Tailwind gives you small single-purpose classes (`p-4` padding, `grid`, `gap-4`, `text-lg`, `md:grid-cols-3`), and you
compose the design in your JSX. With Tailwind v4 and Vite, setup is:

```bash
npm install tailwindcss @tailwindcss/vite
```

```js
// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

```css
/* src/index.css */
@import "tailwindcss";
```

```jsx
function ItemCard({ item, onAdd }) {
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4">
      <img src={item.image} alt={item.title} className="aspect-square w-full rounded object-cover" />
      <h3 className="font-semibold">{item.title}</h3>
      <p className="text-lg font-bold">₹{item.price.toLocaleString("en-IN")}</p>
      <button
        type="button"
        onClick={() => onAdd(item.id)}
        className="rounded bg-teal-700 px-3 py-2 text-white hover:bg-teal-800 focus-visible:outline-2"
      >
        Add to cart
      </button>
    </article>
  );
}
```

Responsive prefixes are **mobile first**, exactly like Week 9: `grid-cols-1 md:grid-cols-3` means one column by
default and three from the `md` breakpoint up. Check the official Tailwind installation guide for the version you
install, as setup steps have changed between major versions.

## Composition patterns

React components combine like functions. A few patterns cover most needs.

**1. `children` for wrappers.** Layouts, cards, modals and panels should not care what is inside them:

```jsx
function Panel({ title, children }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
```

**2. Specialised components.** Build a general component once, then make specific versions by fixing some props:

```jsx
function Button({ variant = "primary", ...props }) {
  return <button type="button" className={`btn btn-${variant}`} {...props} />;
}

const DangerButton = (props) => <Button variant="danger" {...props} />;
```

`...props` passes every other prop (`onClick`, `disabled`, `children`, `aria-label`) straight through.

**3. Container and presentational split.** Keep state and logic in a parent (`CatalogPage`) and make the children
simple functions of their props (`ItemGrid`, `ItemCard`, `FilterBar`). Presentational components are easy to reuse
and to test.

Prefer composition over giant components with many `if` branches. If a component's props list keeps growing, it is
usually two components.

## Build: the catalogue (WB-12)

### Data

Create `src/data/items.json` with **20 or more** items:

```json
[
  {
    "id": "itm-001",
    "title": "Engineering Mathematics (2nd hand)",
    "category": "books",
    "price": 350,
    "condition": "Good",
    "seller": "Asha R.",
    "image": "https://placehold.co/300x300?text=Book",
    "listedAt": "2026-11-02"
  }
]
```

Categories could be `books`, `calculators`, `lab-coats`, `instruments` and `other`.

### Component tree

```text
App                         state: query, category, sort, cartIds
├── Header
│   └── CartBadge           props: count
├── FilterBar               props: query, category, sort + their onChange callbacks
│   ├── SearchBox
│   ├── CategorySelect
│   └── SortSelect
└── ItemGrid                props: items, onAdd
    └── ItemCard × n        props: item, onAdd
```

Draw it, photograph or export it, and commit it as `docs/component-tree.png`.

### Combining filter, search and sort

```jsx
import { useState } from "react";
import allItems from "./data/items.json";

const SORTS = {
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  newest: (a, b) => b.listedAt.localeCompare(a.listedAt),
};

export default function App() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [cartIds, setCartIds] = useState([]);

  const q = query.trim().toLowerCase();
  const visible = allItems
    .filter((item) => category === "all" || item.category === category)
    .filter((item) => item.title.toLowerCase().includes(q))
    .toSorted(SORTS[sort]);

  function addToCart(id) {
    setCartIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }

  return (
    <>
      <Header cartCount={cartIds.length} />
      <FilterBar
        query={query} onQueryChange={setQuery}
        category={category} onCategoryChange={setCategory}
        sort={sort} onSortChange={setSort}
      />
      <p>{visible.length} items</p>
      <ItemGrid items={visible} onAdd={addToCart} />
    </>
  );
}
```

- Filtering and sorting are **derived** during render, not stored in state.
- `toSorted` returns a new array, so the imported data is never mutated (`[...arr].sort(fn)` works too).
- ISO dates (`YYYY-MM-DD`) sort correctly as strings, which is why `localeCompare` works for "newest".
- `ItemGrid` shows "No items match" when `items` is empty.

### Stretch: load with fetch

Move `items.json` to `public/items.json` and load it in an effect with
`` fetch(`${import.meta.env.BASE_URL}items.json`) `` and a loading state, as in S3. Files in `public/` are served as
they are from the site's base path (`BASE_URL` is `/` unless you set `base` in `vite.config.js`).

## WB-12 checklist

- [ ] Vite + React in a new repository `campus-marketplace`, front end in a `client/` folder.
- [ ] `docs/component-tree.png` committed.
- [ ] 20+ items in `items.json` with title, category, price in INR, condition, seller and image URL.
- [ ] Reusable components with props: `ItemCard`, `ItemGrid`, `FilterBar`, `SearchBox`, `CartBadge`.
- [ ] `useState` for search text, category, sort (price, newest) and cart count; filters and sort combine correctly.
- [ ] Stable keys from item ids; an empty-result message.
- [ ] Styled with CSS Modules or Tailwind; usable at 360px width.
- [ ] Be ready to explain any line, especially where each piece of state lives and why.

## Career task: one LinkedIn post

Publish one LinkedIn post about a project you have built so far (the portfolio, the WB-10 app or the API explorer):

- **What** you built, in one sentence, with the live link.
- **How**: the main tools and one interesting decision.
- **What you learned**: one honest lesson, such as a bug that taught you something.

Add a screenshot or a short screen recording. Keep it short and specific; a post that teaches one thing reads better
than a list of buzzwords.

## Check yourself

1. Two components both use the class name `.card` in CSS Modules. Why do they not clash?
2. Why are `visible` items calculated during render instead of kept in state?
3. Where does the cart count state live in the tree above, and why there?
