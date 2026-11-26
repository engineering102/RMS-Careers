---
type: notes
title: "W13 · S4 · Component Testing, Memoisation and Accessibility Checks"
slug: w13-s4-testing-memo-accessibility
topic: React Testing & Quality
subject: web-development
minutes: 40
description: Setting up Vitest and React Testing Library, testing a reducer and components the way a user uses them, when React.memo, useMemo and useCallback actually help, and quick accessibility checks for a React app.
---
# Component testing, memoisation and accessibility checks

Your app works when you click through it today. Tests prove it still works next week, after your teammate refactors
the cart. This session sets up automated tests, then covers two quality topics interviewers like to probe: performance
with memoisation, and accessibility.

## The tools

| Tool | Job |
|---|---|
| **Vitest** | Test runner built for Vite projects; Jest-compatible `describe`, `it`, `expect` |
| **jsdom** | A fake browser DOM inside Node, so components can render without a real browser |
| **React Testing Library (RTL)** | Renders components and finds elements the way a user would (by role, label, text) |
| **user-event** | Simulates real typing and clicking |
| **jest-dom** | Readable matchers such as `toBeInTheDocument()` and `toBeDisabled()` |

```bash
npm install --save-dev vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

Add a `test` section to `vite.config.js`:

```js
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
});
```

```js
// src/setupTests.js
import '@testing-library/jest-dom/vitest';
```

```json
"scripts": {
  "test": "vitest"
}
```

`npm test` starts Vitest in watch mode: it re-runs affected tests whenever you save. `npx vitest run` runs once and
exits, which is what CI uses (Week 15). Name test files `Something.test.jsx` next to the code they test.

## Test 1: a pure function (the cart reducer)

The easiest and most valuable tests are on plain functions. Your reducer from Session 2 is one.

```js
// src/context/cartReducer.test.js
import { cartReducer, initialCart } from './cartReducer.js';

const pen = { id: 1, title: 'Pen', price: 20 };

describe('cartReducer', () => {
  it('adds a new item with quantity 1', () => {
    const state = cartReducer(initialCart, { type: 'add', item: pen });
    expect(state.items).toEqual([{ ...pen, qty: 1 }]);
  });

  it('increments quantity when the same item is added again', () => {
    let state = cartReducer(initialCart, { type: 'add', item: pen });
    state = cartReducer(state, { type: 'add', item: pen });
    expect(state.items[0].qty).toBe(2);
  });

  it('removes the item when quantity is set to 0', () => {
    const state = cartReducer({ items: [{ ...pen, qty: 3 }] }, { type: 'setQty', id: 1, qty: 0 });
    expect(state.items).toHaveLength(0);
  });

  it('does not mutate the previous state', () => {
    const before = { items: [] };
    cartReducer(before, { type: 'add', item: pen });
    expect(before.items).toHaveLength(0);
  });
});
```

Each test follows **Arrange → Act → Assert**: build the input, call the code, check the result.

## Test 2: a component, from the user's point of view

RTL's guiding idea: *test what the user sees and does, not the implementation.* Do not test that `useState` was
called; test that clicking the button changes the text on screen.

```jsx
// src/components/Counter.jsx
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>Increase</button>
    </div>
  );
}
```

```jsx
// src/components/Counter.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Counter from './Counter.jsx';

it('increases the count when the button is clicked', async () => {
  const user = userEvent.setup();
  render(<Counter />);

  await user.click(screen.getByRole('button', { name: /increase/i }));

  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

### Choosing a query

Prefer queries in this order; the higher ones also check that your UI is accessible.

| Query | Finds | Use for |
|---|---|---|
| `getByRole('button', { name: /add/i })` | Elements by ARIA role and accessible name | Buttons, links, headings, inputs: almost everything |
| `getByLabelText('Email')` | Inputs by their `<label>` | Form fields |
| `getByText('Cart is empty')` | Visible text | Messages, paragraphs |
| `getByTestId('cart-total')` | `data-testid` attribute | Last resort |

Variants: `getBy…` throws if nothing matches; `queryBy…` returns `null` (use it to assert something is **absent**);
`findBy…` returns a promise and waits (use it for things that appear after a fetch).

### Components that need providers or a router

A component that calls `useCart()` or renders a `<Link>` crashes if rendered alone. Wrap it in what it needs:

```jsx
import { MemoryRouter } from 'react-router-dom';
import { CartProvider } from '../context/CartContext.jsx';

function renderWithProviders(ui, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <CartProvider>{ui}</CartProvider>
    </MemoryRouter>
  );
}

it('shows the cart count after adding an item', async () => {
  const user = userEvent.setup();
  renderWithProviders(
    <>
      <Header />
      <ItemCard item={{ id: 1, title: 'Pen', price: 20 }} />
    </>
  );
  await user.click(screen.getByRole('button', { name: /add to cart/i }));
  expect(screen.getByText(/cart \(1\)/i)).toBeInTheDocument();
});
```

`MemoryRouter` keeps the URL in memory instead of the address bar, which is ideal in tests.

For components that fetch, do not call a real server in unit tests. Pass the data in as props, or replace `fetch`
with a fake using `vi.fn()` / `vi.spyOn(globalThis, 'fetch')` and assert with `findBy…`.

## Memoisation: React.memo, useMemo, useCallback

React re-renders a component whenever its parent re-renders. Usually that is fast enough, and you should **measure
before optimising** (React DevTools → Profiler). When a render is genuinely expensive, three tools help:

| Tool | Remembers | Example |
|---|---|---|
| `useMemo(fn, deps)` | The **result** of a calculation until deps change | Filtering and sorting 10,000 items |
| `useCallback(fn, deps)` | The **function object** itself until deps change | A handler passed to a memoised child |
| `React.memo(Component)` | Skips re-rendering if props are shallow-equal to last time | A large list row |

```jsx
const visible = useMemo(
  () => items.filter((i) => i.title.toLowerCase().includes(query.toLowerCase())),
  [items, query]
);
```

Why `useCallback` and `React.memo` usually come together: a function created during render is a **new object** each
time, so `React.memo` sees a "changed" prop and re-renders anyway.

```jsx
const ItemRow = memo(function ItemRow({ item, onAdd }) {
  return <li>{item.title} <button onClick={() => onAdd(item)}>Add</button></li>;
});

function ItemList({ items }) {
  const { dispatch } = useCart();
  const handleAdd = useCallback((item) => dispatch({ type: 'add', item }), [dispatch]);
  return <ul>{items.map((i) => <ItemRow key={i.id} item={i} onAdd={handleAdd} />)}</ul>;
}
```

`dispatch` from `useReducer` never changes identity, so `handleAdd` is created once. Memoisation has a cost (memory
and comparison work), so use it for measured problems, not on every component.

## Accessibility checks

Accessible apps work with a keyboard, a screen reader and zoom. They are also easier to test, because RTL's best
queries rely on the same roles and labels.

- [ ] Every input has a `<label htmlFor>` (or wraps the input); placeholders are not labels.
- [ ] Buttons are `<button>`, links are `<Link>`/`<a>`; no clickable `<div>`s.
- [ ] Images have meaningful `alt` text (`alt=""` for decorative ones).
- [ ] One `<h1>` per page and headings in order.
- [ ] Everything works with **Tab**, **Shift+Tab**, **Enter** and **Space**, with a visible focus outline.
- [ ] Loading and error messages use `role="status"` / `role="alert"`.
- [ ] Colour contrast passes (Lighthouse or axe DevTools reports it).

Tools: run **Lighthouse** (Chrome DevTools) on each page; install the **axe DevTools** browser extension; add
`eslint-plugin-jsx-a11y` to catch problems as you type. After a route change in an SPA, consider moving focus to the
new page's `<h1>`, because screen-reader users otherwise get no signal that the page changed.

## Lab: write three component tests

1. Install and configure Vitest, jsdom, RTL, user-event and jest-dom as above; `npm test` runs with zero tests.
2. Test the cart reducer: add, add again, set quantity to 0, and no mutation.
3. Test a component with user-event: the add-to-cart button updates the header count (wrap in providers).
4. Test the catalogue filter: given items as props, typing in the search box with `user.type` hides non-matching
   items; use `queryByText` to assert an item is gone.
5. Run Lighthouse on the catalogue and cart pages; fix at least two accessibility findings and note them in your
   commit message.
6. Stretch: test the empty state ("No items match") and the 404 page using `MemoryRouter initialEntries`.

## Check yourself

1. Why does RTL encourage `getByRole('button', { name: /save/i })` over `getByTestId('save-btn')`?
2. You wrapped a row in `React.memo`, but it still re-renders every time. The parent passes
   `onAdd={() => add(item)}`. Explain why, and fix it.
3. Which query do you use to assert that an error message is **not** on the screen, and why not `getByText`?
