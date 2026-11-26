---
type: notes
title: "W12 · S3 · Controlled Forms, useEffect, Data Fetching and Lifting State Up"
slug: w12-s3-forms-effects-lifting-state
topic: Forms, Effects & Shared State
subject: web-development
minutes: 40
description: Build controlled forms with validation, synchronise with the outside world using useEffect (dependencies, cleanup, fetching data with loading and error states), and share state between components by lifting it up.
---
# Controlled forms, useEffect, data fetching and lifting state up

## Controlled forms

In a **controlled** input, React state is the single source of truth: the input shows the state, and every keystroke
updates the state.

```jsx
import { useState } from "react";

export default function SellForm({ onAdd }) {
  const [form, setForm] = useState({ title: "", price: "", category: "books" });
  const [error, setError] = useState("");

  function update(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));    // one handler for every field
  }

  function handleSubmit(e) {
    e.preventDefault();
    const price = Number(form.price);
    if (!form.title.trim()) return setError("Title is required.");
    if (!Number.isFinite(price) || price <= 0) return setError("Enter a price above 0.");
    setError("");
    onAdd({ ...form, title: form.title.trim(), price });
    setForm({ title: "", price: "", category: "books" });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="title">Title</label>
      <input id="title" name="title" value={form.title} onChange={update} />

      <label htmlFor="price">Price (₹)</label>
      <input id="price" name="price" type="number" min="1" value={form.price} onChange={update} />

      <label htmlFor="category">Category</label>
      <select id="category" name="category" value={form.category} onChange={update}>
        <option value="books">Books</option>
        <option value="calculators">Calculators</option>
        <option value="lab">Lab equipment</option>
      </select>

      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit">List item</button>
    </form>
  );
}
```

Points to notice:

- `value` + `onChange` on every field. A `value` without `onChange` gives a read-only input (React warns you).
- `[name]: value` uses a **computed property name**, so the input's `name` attribute picks which field changes.
- Inputs always give **strings**; convert with `Number()` before validating or storing.
- `e.preventDefault()` in `onSubmit`, just as in plain JavaScript.
- For a checkbox, read `e.target.checked` instead of `value`.

Controlled inputs make validation, disabling the submit button, and resetting the form simple, because the data is
already in state.

## useEffect: synchronising with the outside world

Rendering should be a **pure calculation**: props and state in, JSX out. Anything that reaches outside React (fetching
data, timers, subscriptions, `document.title`, localStorage) is a **side effect** and belongs in `useEffect`:

```jsx
import { useEffect, useState } from "react";

function CartTitle({ count }) {
  useEffect(() => {
    document.title = count > 0 ? `(${count}) Campus Marketplace` : "Campus Marketplace";
  }, [count]);   // run after the first render, then again whenever count changes

  return null;
}
```

The effect runs **after** React has updated the page. The second argument, the **dependency array**, controls when it
runs again:

| Dependency array | The effect runs |
|---|---|
| `[count]` | after the first render and whenever `count` changes |
| `[]` | once after the first render (on mount) |
| omitted | after **every** render (rarely what you want) |

Include every prop, state value or function from the component that the effect **uses**. The `react-hooks` ESLint
rule warns you when one is missing; trust it.

### Cleanup

If an effect starts something that keeps running, return a **cleanup function** to stop it. React calls it before
running the effect again and when the component is removed:

```jsx
useEffect(() => {
  const id = setInterval(() => setSeconds((s) => s + 1), 1000);
  return () => clearInterval(id);      // cleanup
}, []);
```

In development, `StrictMode` deliberately mounts each component, runs its effects, cleans them up and runs them again.
If your effect breaks when run twice (two intervals, duplicated data), it is missing a cleanup. This does not happen in
the production build.

### You might not need an effect

Do not use an effect to calculate something from props or state. This is a common beginner mistake:

```jsx
// Unnecessary: an extra render and a chance for the two to disagree
const [visible, setVisible] = useState([]);
useEffect(() => setVisible(items.filter(matches)), [items, query]);

// Better: derive it during render
const visible = items.filter(matches);
```

Effects are for talking to things **outside** React.

## Fetching data in an effect

```jsx
import { useEffect, useState } from "react";

export default function ProductSearch() {
  const [query, setQuery] = useState("phone");
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");   // "loading" | "error" | "ready"

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setStatus("loading");
      try {
        const url = `https://dummyjson.com/products/search?q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setProducts(data.products);
        setStatus("ready");
      } catch (err) {
        if (err.name !== "AbortError") setStatus("error");
      }
    }

    load();
    return () => controller.abort();     // a newer query (or unmount) cancels this request
  }, [query]);

  return (
    <section>
      <label htmlFor="q">Search products</label>
      <input id="q" value={query} onChange={(e) => setQuery(e.target.value)} />

      {status === "loading" && <p>Loading…</p>}
      {status === "error" && <p role="alert">Could not load products. Try again.</p>}
      {status === "ready" && products.length === 0 && <p>No products match "{query}".</p>}
      {status === "ready" && (
        <ul>
          {products.map((p) => (
            <li key={p.id}>{p.title}: ${p.price}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

DummyJSON is a free practice API that returns fake product data; its prices are in dollars, so this example shows a
`$`. Everything from Week 11 carries over: `async`/`await`, checking `res.ok`, `AbortController`, and the four UI
states. The new part is **where** it lives: an effect that re-runs when `query` changes, with a cleanup that cancels
the outdated request. To fire fewer requests, debounce the query (the Week 11 closure, or a small custom hook).

The effect function itself cannot be `async` (it must return nothing or a cleanup function), so define an `async`
function inside it and call it.

In larger apps you will usually fetch with a data library or a framework feature instead of hand-written effects; the
pattern above is what those tools do for you, and you should understand it first.

## Lifting state up

Two sibling components often need the **same** state. Example: `SearchBox` changes the search text, and `ItemGrid`
needs it to filter. Neither sibling can read the other's state.

The fix: **move the state to their closest common parent**, and pass it down as props, together with a function to
change it:

```text
            App   ← owns: query, category, cartCount
          /     \
   FilterBar     ItemGrid
   (query, onQueryChange)   (items filtered by query, onAddToCart)
```

```jsx
import { useState } from "react";
import items from "./data/items.json";

function SearchBox({ value, onChange }) {
  return (
    <>
      <label htmlFor="search">Search</label>
      <input id="search" value={value} onChange={(e) => onChange(e.target.value)} />
    </>
  );
}

function ItemGrid({ items, onAdd }) {
  if (items.length === 0) return <p>No items match your search.</p>;
  return (
    <ul className="grid">
      {items.map((item) => (
        <li key={item.id}>
          {item.title}
          <button type="button" onClick={() => onAdd(item.id)}>Add to cart</button>
        </li>
      ))}
    </ul>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);

  const visible = items.filter((i) => i.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <p>Cart: {cart.length}</p>
      <SearchBox value={query} onChange={setQuery} />
      <ItemGrid items={visible} onAdd={(id) => setCart((c) => [...c, id])} />
    </>
  );
}
```

Data flows **down** as props; events flow **up** through callback props (`onChange`, `onAdd`). The rule to remember:
**state lives in the lowest common parent of every component that needs it.** Lower than that and a sibling cannot
see it; higher than that and too much of the app re-renders and knows about it.

Vite lets you import a JSON file directly (`import items from "./data/items.json"`), which is how WB-12 starts.

## Lab: product search with API data

- [ ] Build `ProductSearch` as above, then split it into `SearchBox`, `ProductList` and `StatusMessage` with state
      lifted into the parent.
- [ ] Add a category `select` (controlled) that filters the fetched results **without** a new request (derived, not
      an effect).
- [ ] Add a "Sell an item" controlled form that validates title and price and adds the item to a local list.
- [ ] In DevTools → Network, type quickly and confirm that outdated requests show as cancelled.
- [ ] Turn the network to **Offline** and check the error message appears.

## Check yourself

1. What is the difference between `useEffect(fn, [])` and `useEffect(fn)` with no array?
2. Why should a filtered list be calculated during render instead of stored in state with an effect?
3. `SearchBox` and `ItemGrid` both need the search text. Where should that state live, and how does `SearchBox` change
   it?
