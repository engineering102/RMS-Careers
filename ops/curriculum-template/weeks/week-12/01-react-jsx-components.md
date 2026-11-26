---
type: notes
title: "W12 · S1 · Why React: Vite Setup, JSX, Components and Props"
slug: w12-s1-react-jsx-components
topic: React Components & Props
subject: web-development
minutes: 35
description: The problem React solves, setting up a React project with Vite, JSX rules, function components, props and children, and how to break a page design into a component tree.
---
# Why React: Vite setup, JSX, components and props

## The problem React solves

In Week 10 you wrote apps like this: keep the data in an array, and whenever it changes, call `render()` to rebuild
the page. That idea works, but by hand it gets painful: you rebuild whole lists for one change, wire every event
yourself, and keep many render functions in sync.

React keeps the same idea and automates the hard parts:

- You describe **what the UI should look like for the current data** (state).
- When the state changes, React works out **what actually changed** in the page and updates only that.
- The UI is built from **components**: small, reusable functions that each own one piece of the screen.

React is a library for building user interfaces. It is not a full framework: routing, data fetching and styling are
choices you add (Week 13 adds routing).

## Setting up with Vite

```bash
npm create vite@latest campus-marketplace -- --template react
cd campus-marketplace
npm install
npm run dev
```

The important files:

```text
campus-marketplace/
├── index.html            has <div id="root"></div> and loads src/main.jsx
├── package.json          react, react-dom, vite and the React plugin
├── vite.config.js
└── src/
    ├── main.jsx          mounts <App /> into #root
    ├── App.jsx           your top-level component
    └── index.css
```

`src/main.jsx` looks like this:

```jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`StrictMode` adds extra checks in development only (it deliberately runs some code twice to expose bugs; more on that
in S3). Delete the demo content in `App.jsx` and start fresh.

Install the **React Developer Tools** browser extension: it adds Components and Profiler tabs to DevTools, where you
can inspect each component's props and state.

## JSX

JSX lets you write HTML-like markup inside JavaScript. Vite compiles it to ordinary function calls.

```jsx
function App() {
  const name = "Asha";
  const items = 3;
  return (
    <main className="page">
      <h1>Hello, {name}</h1>
      <p>You have {items} {items === 1 ? "item" : "items"} in your cart.</p>
      <label htmlFor="search">Search</label>
      <input id="search" type="search" />
    </main>
  );
}

export default App;
```

JSX rules that differ from HTML:

| Rule | Example |
|---|---|
| Return **one** parent element (or a fragment `<>...</>`) | `<><h1 /><p /></>` |
| `class` becomes `className` | `<div className="card">` |
| `for` becomes `htmlFor` | `<label htmlFor="email">` |
| Every tag must close | `<img />`, `<input />`, `<br />` |
| Attributes are camelCase | `onClick`, `tabIndex`, `aria-label` stays as is |
| `{ }` holds any JavaScript **expression** | `{price * qty}`, `{user.name}`, `{isOpen ? "Hide" : "Show"}` |
| `style` takes an object | `style={{ marginTop: 8 }}` |

Inside `{ }` you can use expressions, not statements: no `if` or `for`, but the ternary operator, `&&` and `map`
all work (S2).

JSX is safe by default: text you put inside `{ }` is escaped, so a user's input cannot inject HTML the way
`innerHTML` can.

## Components

A component is a **function that returns JSX**. Its name **must start with a capital letter**, so React can tell
`<ItemCard />` (your component) from `<div>` (an HTML tag).

```jsx
function Header() {
  return (
    <header className="header">
      <h1>Campus Marketplace</h1>
    </header>
  );
}
```

Put each component in its own file and export it:

```jsx
// src/components/Header.jsx
export default function Header() {
  return <header className="header"><h1>Campus Marketplace</h1></header>;
}

// src/App.jsx
import Header from "./components/Header.jsx";

export default function App() {
  return (
    <>
      <Header />
      <main>...</main>
    </>
  );
}
```

React projects commonly name component files in PascalCase (`ItemCard.jsx`) to match the component. Follow the
convention of the project you are in.

## Props: passing data down

**Props** are a component's inputs, passed like HTML attributes. The component receives them as one object, usually
destructured:

```jsx
function ItemCard({ title, price, condition = "Used" }) {
  return (
    <article className="item-card">
      <h3>{title}</h3>
      <p>₹{price.toLocaleString("en-IN")}</p>
      <p className="muted">{condition}</p>
    </article>
  );
}

// Using it
<ItemCard title="Engineering Mathematics textbook" price={350} condition="Good" />
<ItemCard title="Scientific calculator" price={600} />
```

- Strings can be passed in quotes; everything else (numbers, booleans, arrays, objects, functions) goes in `{ }`.
- Default values work like normal destructuring defaults (`condition = "Used"`).
- **Props are read-only.** A component must never change its props. To change data, the owner of that data changes
  its **state** (S2) and passes new props down.

Data in React flows **one way: from parent to child, through props.**

### children

Whatever you put between a component's opening and closing tags arrives as the `children` prop. This makes
**wrapper** components easy:

```jsx
function Card({ title, children }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

<Card title="Filters">
  <p>Choose a category and a price range.</p>
</Card>
```

## Thinking in components

Before writing code, **draw the component tree**. Take a design and draw boxes around every piece that is repeated
or has one clear job:

```text
App
├── Header
│   ├── Logo
│   └── CartBadge                (shows the cart count)
├── FilterBar
│   ├── SearchBox
│   ├── CategorySelect
│   └── SortSelect
└── ItemGrid
    └── ItemCard  × n             (one per item)
```

Questions to ask for each box:

1. **Is it repeated?** Then it is a component that receives its data through props (`ItemCard`).
2. **Does it have one clear job?** A component that does three things should probably be three.
3. **Which data does it need?** Write the props next to each box: `ItemCard({ title, price, condition, image })`.

Name components after **what they are** (`ItemCard`), not what they look like (`BlueBox`).

## Lab: break a page into a component tree

You are given a screenshot of a product catalogue page (header with logo and cart count, search box, category
filter, sort menu, a grid of product cards, footer).

- [ ] On paper, draw boxes around every component and draw the tree, with the props of each component written next
      to it.
- [ ] Create the Vite React project and one file per component under `src/components/`.
- [ ] Render a static version: `ItemGrid` receives a hard-coded array and renders three `ItemCard`s with different
      props (just write three `<ItemCard />` lines for now; S2 shows how to use `map`).
- [ ] Build a `Card` wrapper that uses `children`, and use it for the filter panel.
- [ ] Open React Developer Tools → Components and check that each card shows the props you passed.

## Check yourself

1. Why must a component name start with a capital letter?
2. Give three differences between JSX and HTML.
3. A child component wants to change the `price` prop it received. Why is that not allowed, and what should happen
   instead?
