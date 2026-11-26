---
type: notes
title: "W12 · S2 · State with useState, Events, Conditional Rendering and Lists"
slug: w12-s2-state-events-lists
topic: useState, Events & Lists
subject: web-development
minutes: 35
description: Give components memory with useState, handle events, update arrays and objects immutably, render conditionally, and render lists with map and stable keys.
---
# State, events, conditional rendering and lists

Props come from outside a component. **State** is data a component owns and changes over time: a counter, whether a
menu is open, the text in a search box, the items in a cart. When state changes, React **re-renders** the component
with the new value.

## useState

```jsx
import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);   // [current value, setter], initial value 0

  return (
    <div>
      <p>Count: {count}</p>
      <button type="button" onClick={() => setCount(count + 1)}>Add one</button>
      <button type="button" onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}
```

What happens on a click:

1. `setCount(1)` asks React to update the state.
2. React calls `Counter()` again (a **re-render**). This time `useState` returns `1`.
3. React compares the new JSX with the old and updates only the text that changed.

Why not just `let count = 0; count++`? A normal variable is recreated on every render and React does not know it
changed. Only state set through the setter triggers a re-render.

### Rules of hooks

Functions starting with `use` are **hooks**. Two rules:

- Call hooks only at the **top level** of a component (not inside `if`, loops or nested functions).
- Call hooks only from **React components** or your own custom hooks.

React identifies each piece of state by the **order** of the hook calls, which is why the order must be the same on
every render. The ESLint setup in a Vite React project includes a plugin that checks these rules.

### State updates are not immediate

```jsx
function handleClick() {
  setCount(count + 1);
  setCount(count + 1);
  console.log(count);   // still the old value: state updates apply on the next render
}
// one click adds 1, not 2: both calls used the same old count
```

When the new value depends on the old one, pass an **updater function**:

```jsx
setCount((c) => c + 1);
setCount((c) => c + 1);   // now one click adds 2
```

## Handling events

```jsx
<button type="button" onClick={handleClick}>Save</button>       // pass the function
<button type="button" onClick={() => remove(item.id)}>Delete</button> // wrap it to pass arguments
<button type="button" onClick={handleClick()}>Oops</button>     // WRONG: calls it during render
```

Event names are camelCase (`onClick`, `onChange`, `onSubmit`, `onKeyDown`) and the handler receives an event object,
just as in Week 10:

```jsx
<input value={text} onChange={(e) => setText(e.target.value)} />
```

## Updating objects and arrays: never mutate

React decides whether to re-render by checking if the state value is a **new** value. If you change an array in place
and pass the same array back, React may skip the update. Always create a **new** array or object, using the tools from
Week 10:

| Goal | Write | Not |
|---|---|---|
| add an item | `setItems([...items, newItem])` | `items.push(newItem)` |
| remove an item | `setItems(items.filter((i) => i.id !== id))` | `items.splice(...)` |
| change one item | `setItems(items.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)))` | `item.qty++` |
| change one field of an object | `setForm({ ...form, email: value })` | `form.email = value` |
| sort | `setItems([...items].sort(compare))` | `items.sort(compare)` |

## Toggle and conditional rendering

```jsx
function Faq({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="faq">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {question}
      </button>
      {open && <p>{answer}</p>}
    </div>
  );
}
```

Three ways to show things conditionally:

```jsx
{isLoggedIn ? <Profile /> : <LoginButton />}   // either / or
{cartCount > 0 && <span className="badge">{cartCount}</span>}   // show or nothing

if (items.length === 0) {                       // early return before the main JSX
  return <p>No items yet.</p>;
}
```

A trap with `&&`: `{items.length && <List />}` renders a literal **0** when the list is empty, because `0` is a value
React displays. Write `{items.length > 0 && <List />}`.

## Rendering lists

Use `map` to turn an array of data into an array of elements:

```jsx
const items = [
  { id: "b1", title: "Data Structures textbook", price: 300 },
  { id: "c1", title: "Scientific calculator", price: 650 },
  { id: "l1", title: "Lab coat (M)", price: 200 },
];

function ItemList() {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          {item.title}: ₹{item.price}
        </li>
      ))}
    </ul>
  );
}
```

### Keys

Each element in a list needs a **`key`** that is unique among its siblings and **stable** across renders. React uses
keys to match old and new elements, so it can keep the right state with the right item when the list is reordered,
filtered or added to.

- Use an **id from your data** (`item.id`).
- Do **not** use the array index when the list can be reordered, filtered or edited. If item 0 is deleted, every
  index shifts and React attaches state (such as a half-typed input or a checked box) to the wrong item.
- Do not generate keys with `Math.random()` during render: every render would create new keys and React would rebuild
  every item.
- The key goes on the outermost element returned from `map`, and the child component does not receive it as a prop.

## Worked example: a filterable list

```jsx
import { useState } from "react";

const SUBJECTS = ["Data Structures", "DBMS", "Operating Systems", "Computer Networks", "Discrete Maths"];

export default function SubjectFilter() {
  const [query, setQuery] = useState("");

  const visible = SUBJECTS.filter((s) => s.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <section>
      <label htmlFor="q">Filter subjects</label>
      <input id="q" value={query} onChange={(e) => setQuery(e.target.value)} />

      {visible.length === 0 ? (
        <p>No subjects match "{query}".</p>
      ) : (
        <ul>
          {visible.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
      <p>{visible.length} of {SUBJECTS.length} shown</p>
    </section>
  );
}
```

Notice that `visible` is **not** state. It is **derived** from `query` and the list on every render. Store the
minimum state you need and calculate everything else; duplicated state gets out of sync.

## Lab: counter, toggle and filterable list

- [ ] **Counter** with +1, −1 and Reset; it never goes below 0; a "+5" button uses five updater calls and really adds
      5.
- [ ] **Toggle**: a "Show details" button that shows and hides a panel, with `aria-expanded` and the button text
      changing between "Show" and "Hide".
- [ ] **Filterable list** of at least 10 items (objects with `id`, `title`, `category`): a search box plus category
      buttons; shows "No matches" when empty and a count of visible items.
- [ ] Add a "Remove" button to each list item that removes it from state with `filter`. Check in React Developer Tools
      that the state array changes.

## Check yourself

1. Why does `setCount(count + 1)` called twice in one handler only add one? How do you fix it?
2. What is wrong with `onClick={deleteItem(item.id)}`?
3. Why is the array index a bad key for a list the user can delete items from?
