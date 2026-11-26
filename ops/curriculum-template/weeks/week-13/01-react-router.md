---
type: notes
title: "W13 · S1 · React Router: Routes, URL Params, Nested Routes and Protected Routes"
slug: w13-s1-react-router
topic: React Router
subject: web-development
minutes: 35
description: How a single-page app shows different pages without reloading, React Router routes and links, URL and query params, nested layouts with Outlet, 404 pages and the protected-route pattern.
---
# React Router: building a multi-page single-page app

Last week your React app was one screen. Real products have many: a catalogue, a details page, a cart, a login page.
This session turns one screen into a proper multi-page app without giving up the speed of React.

## What "single-page app" really means

In a traditional website every click on a link asks the server for a new HTML page, and the browser throws the old
page away. In a **single-page app (SPA)** the browser loads one HTML file and one JavaScript bundle once. After that:

1. a click on a link is intercepted by JavaScript;
2. the URL in the address bar is changed with the browser **History API** (no request to the server);
3. React renders the component that matches the new URL.

The page never reloads, so state such as a cart count survives navigation. The URL still changes, so the back button,
bookmarks and shared links keep working. A **router** is the library that maps URLs to components. In React the
standard choice is **React Router**.

```bash
npm install react-router-dom
```

The examples below use the component API (`BrowserRouter`, `Routes`, `Route`), which works the same in React Router
versions 6 and 7. In version 7 you may also import the same names from `react-router`.

## Your first routes

```jsx
// src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

```jsx
// src/App.jsx
import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Cart from './pages/Cart.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <>
      <nav>
        <Link to="/">Home</Link> | <Link to="/cart">Cart</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
```

- `BrowserRouter` wraps the app once and listens to the URL.
- `Routes` looks at the current URL and renders the **best matching** `Route`. Order does not decide the match;
  React Router ranks routes by how specific they are.
- `path="*"` matches anything not matched elsewhere: your 404 page.
- `Link` renders an `<a>` tag but navigates without a reload. **Never use a plain `<a href>` for internal links** in
  an SPA; it reloads the whole app and wipes in-memory state.

`NavLink` is a `Link` that knows whether it is active, which is handy for highlighting the current menu item:

```jsx
<NavLink to="/cart" className={({ isActive }) => (isActive ? 'active' : undefined)}>
  Cart
</NavLink>
```

## URL params: one route, many pages

A details page for item 7 and item 42 is the same component with different data. Put a **param** in the path with a
colon, and read it with `useParams`:

```jsx
<Route path="/items/:id" element={<ItemDetails />} />
```

```jsx
import { useParams } from 'react-router-dom';

export default function ItemDetails() {
  const { id } = useParams();          // "/items/42" → id === "42" (always a string)
  return <h1>Item {id}</h1>;
}
```

Params are always **strings**. If your data uses numeric ids, compare with `Number(id)` or `item.id === Number(id)`.

### Query strings with useSearchParams

Filters and search text belong in the **query string** (`/?category=books&q=calculus`), so a filtered view can be
bookmarked and shared.

```jsx
import { useSearchParams } from 'react-router-dom';

function Catalogue() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') ?? 'all';

  function chooseCategory(value) {
    setSearchParams(value === 'all' ? {} : { category: value });
  }
  // ...filter items by category
}
```

| Put it in… | When | Example |
|---|---|---|
| Path param | It identifies **which** thing the page shows | `/items/42` |
| Query string | It changes **how** the page shows it (filter, sort, page) | `/?sort=price&page=2` |
| Component state | It does not need to survive a refresh or be shared | an open/closed dropdown |

## Navigating from code

After a form is submitted you usually want to move the user somewhere. Use `useNavigate`:

```jsx
import { useNavigate } from 'react-router-dom';

function SellForm() {
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    const newItem = await saveItem(/* form data */);
    navigate(`/items/${newItem.id}`);   // go to the new item's page
  }
  // ...
}
```

`navigate(-1)` goes back one step, like the browser's back button. `navigate('/login', { replace: true })` replaces
the current history entry, so "back" does not return to the page you are leaving.

## Nested routes and layouts

Most pages share a header and footer. Instead of repeating them, make a **layout route** whose component renders an
`<Outlet />`: the place where the matching child route appears.

```jsx
// src/App.jsx
<Routes>
  <Route path="/" element={<Layout />}>
    <Route index element={<Catalogue />} />          {/* "/" */}
    <Route path="items/:id" element={<ItemDetails />} />
    <Route path="cart" element={<Cart />} />
    <Route path="*" element={<NotFound />} />
  </Route>
</Routes>
```

```jsx
// src/components/Layout.jsx
import { Outlet, NavLink } from 'react-router-dom';

export default function Layout() {
  return (
    <>
      <header>
        <NavLink to="/">Campus Marketplace</NavLink>
        <NavLink to="/cart">Cart</NavLink>
      </header>
      <main>
        <Outlet />
      </main>
      <footer>Built for the RMS weekly build</footer>
    </>
  );
}
```

Notes on the syntax:

- Child paths are **relative** (`items/:id`, no leading slash); they are joined to the parent's path.
- `index` marks the child shown at the parent's exact path.
- You can nest further, for example an `/account` layout with `profile` and `orders` children.

## The protected-route pattern

Some pages, such as "Sell an item", should only be reachable when the user is logged in. A **protected route** is a
small component that checks a condition and either renders its children or redirects with `<Navigate>`.

```jsx
// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // remember where the user wanted to go, so login can send them back
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
```

```jsx
<Route
  path="sell"
  element={
    <ProtectedRoute>
      <SellForm />
    </ProtectedRoute>
  }
/>
```

On the login page, read `useLocation().state?.from` after a successful login and `navigate(from ?? '/')`.

> **A protected route is a user-experience feature, not security.** Anyone can open DevTools and change the
> JavaScript running in their browser. Real protection happens on the server, which must reject requests without a
> valid login. You build that in Week 14.

`useAuth` comes from a Context you will write properly in Session 2. For today a fake flag is enough:
`const user = { name: 'Asha' }` or `null`.

## A sensible folder structure

```text
src/
  main.jsx
  App.jsx              routes only
  components/          Layout, ProtectedRoute, ItemCard, ...
  pages/               Catalogue, ItemDetails, Cart, SellForm, Login, NotFound
  context/             AuthContext, CartContext (Session 2)
  hooks/               useItems, useFetch (Session 3)
```

One component per file, named in PascalCase, keeps the route table in `App.jsx` easy to read.

## One deployment warning (for Week 15)

Because the server only has one real file, `index.html`, a visitor who opens `https://your-site/items/42` directly
asks the server for a file called `/items/42`, which does not exist. Static hosts need a **rewrite rule** that serves
`index.html` for every path. You will add it when you deploy in Week 15. In development, Vite already does this.

## Lab: multi-page app skeleton

Start from your Week 12 catalogue (or a fresh Vite + React app).

1. Install `react-router-dom` and wrap `<App />` in `<BrowserRouter>`.
2. Create pages: `Catalogue` (`/`), `ItemDetails` (`/items/:id`), `Cart` (`/cart`), `SellForm` (`/sell`),
   `Login` (`/login`) and `NotFound` (`*`).
3. Build a `Layout` with a header of `NavLink`s and an `<Outlet />`, and nest all pages inside it.
4. Make each `ItemCard` a `Link` to its details page; the details page reads `id` with `useParams` and shows that
   item from your local data, or "Item not found" for an unknown id.
5. Store the selected category in the query string with `useSearchParams`, then refresh the page and check the
   filter is still applied.
6. Wrap `/sell` in a `ProtectedRoute` driven by a hard-coded `user` value; flip it between `null` and an object and
   check the redirect.
7. Commit with a message such as `Add routing with layout, details page and protected sell route`.

## Check yourself

1. Why does clicking a `<Link>` keep your cart count, but clicking `<a href="/cart">` resets it?
2. You need `/items/42` and `/items/42/reviews`. Which value would you read with `useParams`, and what type is it?
3. A classmate says "my `/admin` page is secure because it is inside a `ProtectedRoute`". What is wrong with that claim?
