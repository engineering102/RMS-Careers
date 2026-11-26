---
type: resource
title: "W13 · Cheat Sheet: React Router, Context, useReducer, API States and Testing"
slug: w13-cheat-sheet
topic: Week 13 Reference
subject: web-development
minutes: 10
description: One-page reference for Week 13 — React Router hooks and components, Context + reducer recipe, Vite env variables, the four request states, Vitest and React Testing Library, and this week's tasks.
---
# Week 13 cheat sheet

## React Router (v6/v7 component API)

| Need | Use |
|---|---|
| Enable routing | `<BrowserRouter><App /></BrowserRouter>` in `main.jsx` |
| Route table | `<Routes><Route path="/cart" element={<Cart />} /></Routes>` |
| Layout + children | `<Route path="/" element={<Layout />}>` … children … `</Route>` and `<Outlet />` in `Layout` |
| Default child | `<Route index element={<Home />} />` |
| 404 | `<Route path="*" element={<NotFound />} />` |
| Internal link | `<Link to="/items/7">` · active styling: `<NavLink>` |
| URL param | `path="/items/:id"` → `const { id } = useParams()` (a string) |
| Query string | `const [params, setParams] = useSearchParams(); params.get('q')` |
| Navigate in code | `const navigate = useNavigate(); navigate('/cart')` · `navigate(-1)` |
| Redirect while rendering | `<Navigate to="/login" replace />` |
| Current location | `useLocation()` (`pathname`, `state`) |

Protected route = check the user, else `<Navigate to="/login" replace state={{ from: location.pathname }} />`.
It improves UX only; the server must enforce access.

## Context + reducer recipe

```jsx
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, initialCart);
  const count = cart.items.reduce((s, i) => s + i.qty, 0);       // derive, don't store
  return <CartContext.Provider value={{ ...cart, count, dispatch }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const v = useContext(CartContext);
  if (v === null) throw new Error('useCart must be used inside <CartProvider>');
  return v;
}
```

Reducer rules: pure, never mutate (`[...items, x]`, `items.map`, `items.filter`), throw on unknown actions.
Hook rules: names start with `use`; call only at the top level.

## API integration

```js
// .env.development  →  VITE_API_URL=http://localhost:3001
const API_URL = import.meta.env.VITE_API_URL;   // only VITE_* vars reach the browser; never secrets

const res = await fetch(`${API_URL}/items?_page=1&_limit=6`, { signal });
if (!res.ok) throw new ApiError(res.status, 'Request failed');   // fetch does NOT reject on 404/500
```

| State | Show |
|---|---|
| Loading | `role="status"` spinner or skeleton |
| Error | Message + "Try again" (`role="alert"`) |
| Empty | Friendly message + next step |
| Success | The data |

Cancel stale requests with `AbortController` in the effect cleanup. Reset to page 1 when filters change.
json-server 0.17: `npm run api` → `json-server --watch db.json --port 3001`.

## Testing (Vitest + React Testing Library)

```jsx
const user = userEvent.setup();
render(<MemoryRouter><CartProvider><ItemCard item={pen} /></CartProvider></MemoryRouter>);
await user.click(screen.getByRole('button', { name: /add to cart/i }));
expect(screen.getByText(/cart \(1\)/i)).toBeInTheDocument();
```

| Query prefix | No match | Use for |
|---|---|---|
| `getBy` | throws | Element should be there now |
| `queryBy` | returns `null` | Asserting something is **absent** |
| `findBy` | rejects after waiting | Appears later (after fetch) |

Query priority: `ByRole` → `ByLabelText` → `ByText` → `ByTestId`. Run once (CI): `npx vitest run`.

## Memoisation

`useMemo` caches a value · `useCallback` caches a function · `React.memo` skips re-render on equal props.
Profile first; inline arrow props defeat `React.memo`.

## 60-second project story (career task)

| Part | Time | Say |
|---|---|---|
| Problem | 10 s | Who has the problem and why it matters |
| Approach | 20 s | What you built and the one design decision you are proud of |
| Tech | 15 s | The stack, and why you chose one part of it |
| Result | 15 s | What works now, what you learnt, what you would do next (only true claims) |

## This week

| Item | Details |
|---|---|
| **Deliverable** | Multi-page React app with routing, context and tests: Weekly Build WB-13 (Campus Marketplace 2/3) |
| **Practice quiz** | React Applications: Routing, State Management & APIs (untimed, retakes allowed) |
| **Weekly test** | 15 questions on routing, Context/useReducer, API states and testing, 25 minutes |
| **DSA** | Binary trees: traversals (LC 94, 144, 145), Max Depth (104), Invert (226), Level Order (102), Diameter (543) |
| **Career task** | Project storytelling: explain one project in 60 seconds (problem, approach, tech, result) |
