---
type: notes
title: "W13 · S2 · Shared State: Context, useReducer and Custom Hooks"
slug: w13-s2-context-usereducer-custom-hooks
topic: React State Management
subject: web-development
minutes: 35
description: Why prop drilling hurts, sharing state with the Context API, modelling updates with useReducer, packaging logic in custom hooks, and when a library such as Redux Toolkit or Zustand is worth it.
---
# Shared state: Context, useReducer and custom hooks

In Week 12 you learnt that state lives in the **lowest common parent** of the components that need it. With routing,
that parent is often the whole app: the header shows the cart count, the details page adds to the cart, and the cart
page edits it. This session gives you clean tools for state that many components share.

## The problem: prop drilling

If the cart lives in `App`, every component between `App` and the "Add to cart" button must accept and pass down a
`cart` and an `addToCart` prop, even components that never use them.

```text
App (cart, addToCart)
 └─ Layout (cart, addToCart)          ← only passes them on
     └─ Catalogue (addToCart)         ← only passes it on
         └─ ItemGrid (addToCart)      ← only passes it on
             └─ ItemCard (addToCart)  ← finally uses it
```

This is **prop drilling**. It works for two levels; at five levels it makes every refactor painful.

## Context: broadcast a value to a subtree

The **Context API** lets a parent provide a value that any descendant can read directly, however deep.

```jsx
// src/context/ThemeContext.jsx
import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (value === null) throw new Error('useTheme must be used inside <ThemeProvider>');
  return value;
}
```

Three parts, always:

1. `createContext(defaultValue)` creates the context object.
2. A **Provider** component holds the state and passes `value` down.
3. A small hook (`useTheme`) wraps `useContext` and fails loudly if someone forgets the provider. Components import
   the hook, never the raw context.

Any component inside `<ThemeProvider>` can now write `const { theme, toggle } = useTheme();`.

**Important:** every component that reads a context re-renders when the provider's `value` changes. Keep contexts
focused (one for auth, one for the cart) rather than one giant "AppContext".

## useReducer: when updates have rules

A cart has many kinds of change: add, remove, change quantity, clear. With `useState` that logic ends up scattered
across event handlers. `useReducer` puts **all** the update rules in one pure function.

```js
// src/context/cartReducer.js
export const initialCart = { items: [] };   // each item: { id, title, price, qty }

export function cartReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const existing = state.items.find((i) => i.id === action.item.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === action.item.id ? { ...i, qty: i.qty + 1 } : i
          ),
        };
      }
      return { items: [...state.items, { ...action.item, qty: 1 }] };
    }
    case 'remove':
      return { items: state.items.filter((i) => i.id !== action.id) };
    case 'setQty':
      if (action.qty <= 0) return { items: state.items.filter((i) => i.id !== action.id) };
      return {
        items: state.items.map((i) => (i.id === action.id ? { ...i, qty: action.qty } : i)),
      };
    case 'clear':
      return initialCart;
    default:
      throw new Error(`Unknown cart action: ${action.type}`);
  }
}
```

The rules of a reducer:

- **Pure**: same `(state, action)` in, same new state out. No `fetch`, no `localStorage`, no `Math.random()` inside.
- **Immutable**: never `state.items.push(...)`. Return a new object; React compares references to decide whether to
  re-render, so mutating in place causes "I updated the state but nothing changed on screen" bugs.
- **One action, one meaning**: `{ type: 'add', item }` describes *what happened*; the reducer decides *how state
  changes*.

Because the reducer is a plain function, you can test it without React at all. You will do exactly that in Session 4.

## Context + reducer: the cart provider

Combine the two: the reducer owns the update rules, the context shares the result.

```jsx
// src/context/CartContext.jsx
import { createContext, useContext, useReducer } from 'react';
import { cartReducer, initialCart } from './cartReducer.js';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, initialCart);

  const count = cart.items.reduce((sum, i) => sum + i.qty, 0);
  const total = cart.items.reduce((sum, i) => sum + i.qty * i.price, 0);

  const value = { items: cart.items, count, total, dispatch };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (value === null) throw new Error('useCart must be used inside <CartProvider>');
  return value;
}
```

Notice that `count` and `total` are **derived** during render, not stored in state. Storing them separately would
let them drift out of sync with `items`.

Using it:

```jsx
// main.jsx: wrap once, inside the router
<BrowserRouter>
  <CartProvider>
    <App />
  </CartProvider>
</BrowserRouter>
```

```jsx
// ItemCard.jsx
const { dispatch } = useCart();
<button onClick={() => dispatch({ type: 'add', item })}>Add to cart</button>

// Header.jsx
const { count, total } = useCart();
<span>Cart ({count}) · ₹{total}</span>
```

The prop drilling is gone: `Layout`, `Catalogue` and `ItemGrid` no longer know the cart exists.

## Custom hooks: reuse logic, not markup

A **custom hook** is a function whose name starts with `use` and that calls other hooks. Components share markup;
custom hooks share **behaviour**.

```js
// src/hooks/useLocalStorage.js
import { useEffect, useState } from 'react';

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;          // corrupted JSON or storage blocked
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full or blocked: keep working in memory
    }
  }, [key, value]);

  return [value, setValue];
}
```

Now any component can write `const [darkMode, setDarkMode] = useLocalStorage('darkMode', false);`.

Rules that apply to every hook, custom or built-in:

- Call hooks only at the **top level** of a component or another hook, never inside `if`, loops or nested functions.
- Each call gets its **own** state. Two components calling `useLocalStorage('x', 0)` do not share a React state
  variable; if you need shared state, that is what Context is for.

To persist the cart, the provider can pass an initial value read from `localStorage` as the third argument of
`useReducer` (the lazy initialiser) and save `cart` in a `useEffect`.

## Do you need Redux Toolkit or Zustand?

Context + `useReducer` covers most student and many production apps. Dedicated libraries help when state is large,
updated very often, or touched by many unrelated parts of the app.

| Tool | Idea | Reach for it when |
|---|---|---|
| `useState` / props | Local state, passed down one or two levels | Default for most state |
| Context + `useReducer` | Built-in shared state with central update rules | Auth user, theme, cart |
| **Zustand** | A tiny store; components subscribe to just the slice they read | Shared state that changes often and Context re-renders hurt |
| **Redux Toolkit** | One central store, slices, strict action flow, excellent DevTools | Large apps, big teams, complex updates you want to trace |
| Server-state libraries (e.g. TanStack Query) | Cache and refetch data from APIs | Lots of API data; caching, retries, background refresh |

A Zustand store looks like this, for comparison:

```js
import { create } from 'zustand';

export const useCartStore = create((set) => ({
  count: 0,
  add: () => set((state) => ({ count: state.count + 1 })),
}));

// in a component: const count = useCartStore((s) => s.count);
```

Interviewers often ask "Context or Redux?". A good answer names the trade-off: Context is built in and simple but
re-renders every consumer on each change; a store library adds a dependency in exchange for fine-grained
subscriptions and tooling. Do not add one "just in case".

## Lab: cart state with Context and a reducer

1. Create `cartReducer.js` with `add`, `remove`, `setQty` and `clear` actions exactly as above, plus a default
   branch that throws.
2. Create `CartContext.jsx` with `CartProvider` and `useCart`; wrap the app in `main.jsx`.
3. Show `count` and `total` (formatted in ₹) in the header.
4. Add an "Add to cart" button on `ItemCard` and on the details page.
5. Build the `/cart` page: a row per item with − / + buttons (`setQty`), a remove button and a "Clear cart" button.
   Show "Your cart is empty" when there are no items.
6. Replace the fake `user` flag from Session 1 with an `AuthContext` (`user`, `login(name)`, `logout()`), and make
   `ProtectedRoute` read it.
7. Stretch: persist the cart in `localStorage` using the lazy initialiser and an effect.

## Check yourself

1. Why must `cartReducer` return a new object instead of calling `state.items.push(item)`?
2. Why is `total` calculated during render rather than kept in its own `useState`?
3. Two sibling components each call `useLocalStorage('theme', 'light')`. One changes the theme. Does the other
   update immediately? Why or why not?
