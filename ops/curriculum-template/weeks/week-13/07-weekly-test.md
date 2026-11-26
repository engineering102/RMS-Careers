---
type: quiz
title: "W13 · Weekly Test: React Routing, Shared State and API Integration"
slug: w13-weekly-test
topic: Week 13 Assessment
subject: web-development
quizType: formal
timeLimit: 25
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt test on React Router, Context and useReducer, API loading and error states, component testing and binary trees. 15 questions, 25 minutes.
---
Q: A user is on /cart in your React SPA and clicks a plain `<a href="/items/3">` instead of a `<Link to="/items/3">`. What happens?
A) Exactly the same as Link; React Router intercepts all anchors
*B) The browser loads the page from the server again, so the app restarts and in-memory state such as the cart is lost
C) Nothing happens, because SPAs ignore anchor tags
D) The URL changes but the page content stays the same
Explanation: A plain anchor triggers a full page load. Link updates the URL with the History API and keeps the app running.

Q: The route is `<Route path="/items/:id" element={<ItemDetails />} />` and the URL is /items/42. Inside ItemDetails, what does `const { id } = useParams()` give?
A) The number 42
*B) The string "42"
C) The string "/items/42"
D) undefined, because params need useSearchParams
Explanation: URL params are always strings. Convert with Number(id) if your ids are numbers.

Q: Which state belongs in the query string (for example /?category=books&sort=price) rather than in useState? (Select all that apply.)
*A) The selected category filter on a catalogue
*B) The current sort order of search results
C) Whether a dropdown menu is open
*D) The current page number of a paginated list
Explanation: Filters, sorting and pagination should survive a refresh and be shareable as links. An open dropdown is temporary UI state.

Q: In a layout route `<Route path="/" element={<Layout />}>` with child routes, where do the child pages appear?
A) Below the layout automatically, after its last element
*B) Wherever Layout renders the `<Outlet />` component
C) In a new browser tab
D) Only if Layout passes them in as props
Explanation: Outlet is the placeholder where the matched child route renders.

Q: Your /admin page is wrapped in a ProtectedRoute that redirects to /login when there is no user in context. Which statement is correct?
A) The admin data is now secure because the page cannot be reached
B) ProtectedRoute encrypts the admin API responses
*C) It only improves the user experience; the API must still reject requests without a valid login
D) It is only safe if the route is also lazy-loaded
Explanation: Anything running in the browser can be changed by the user. Access control must be enforced on the server.

Q: What problem does the Context API mainly solve?
A) Making API calls faster
*B) Passing a value through many intermediate components that do not use it (prop drilling)
C) Storing data permanently across browser sessions
D) Replacing all useState calls in an app
Explanation: Context lets any descendant read a value from a provider directly, without threading props through every level.

Q: Which line is a correct way to handle `{ type: 'add', item }` in a reducer whose state is `{ items: [] }`?
A) `state.items.push(action.item); return state;`
*B) `return { items: [...state.items, action.item] };`
C) `state = { items: [action.item] }; return;`
D) `return state.items.concat(action.item);`
Explanation: A reducer must return a new state object without mutating the old one. Option D returns an array, not the state shape.

Q: A CartProvider stores `items` with useReducer. Why should `total` be computed during render instead of stored in a second useState?
A) useState cannot hold numbers
B) Computing during render is always faster
*C) A separately stored total can get out of sync with items; deriving it keeps a single source of truth
D) React does not allow two state variables in one component
Explanation: Derived values should be calculated from the source state, not duplicated.

Q: Which statements about custom hooks are true? (Select all that apply.)
*A) Their names must start with "use"
*B) Two components calling the same custom hook each get their own separate state
C) They must return JSX
*D) They can call other hooks such as useState and useEffect
Explanation: Custom hooks share logic, not state, and they return whatever values are useful. Sharing state needs Context or a store.

Q: In a Vite app, which environment variable can browser code read with `import.meta.env`?
A) `API_URL=http://localhost:3001`
*B) `VITE_API_URL=http://localhost:3001`
C) `REACT_APP_API_URL=http://localhost:3001`
D) Any variable in .env, whatever its name
Explanation: Vite only exposes variables with the VITE_ prefix to client code. They are public, so never put secrets in them.

Q: `const res = await fetch(url)` and the server responds with 404. What happens?
A) The await throws a TypeError
*B) The promise resolves; `res.ok` is false and `res.status` is 404
C) The promise never settles
D) `res.json()` is skipped automatically
Explanation: fetch only rejects on network failure. Always check res.ok or res.status.

Q: A search box fires a request on each change. Typing "cal" then "calc" quickly sometimes shows results for "cal". What is the best fix?
A) Add a longer setTimeout before every fetch
*B) Abort the previous request in the useEffect cleanup with an AbortController (and optionally debounce)
C) Use axios instead of fetch
D) Move the fetch into the render body
Explanation: The slower old response arrives last and overwrites the newer one. Cancelling stale requests removes the race.

Q: In React Testing Library, which query should you use to assert that an error message is NOT shown?
A) `getByText('Error')`
*B) `queryByText('Error')` with `expect(...).not.toBeInTheDocument()`
C) `findByText('Error')`
D) `getByTestId('error')`
Explanation: getBy throws when nothing matches, and findBy waits and rejects. queryBy returns null, which you can assert on.

Q: A memoised row `React.memo(ItemRow)` still re-renders whenever its parent renders. The parent passes `onAdd={() => add(item)}`. Why?
A) React.memo only works on class components
*B) A new function object is created on every parent render, so the onAdd prop is never equal to the previous one
C) Rows inside a list can never be memoised
D) The key prop is missing
Explanation: React.memo compares props shallowly. Stabilise the handler with useCallback and pass the item inside the child.

Q: For the tree with root 1, left child 2 (children 4 and 5) and right child 3 (right child 6), what is the inorder traversal?
A) 1 2 4 5 3 6
*B) 4 2 5 1 3 6
C) 4 5 2 6 3 1
D) 1 2 3 4 5 6
Explanation: Inorder is left, node, right. Option A is preorder, C is postorder and D is level order.
