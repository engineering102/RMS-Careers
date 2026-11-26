---
type: quiz
title: "Phase 3 Test: Full Stack Web Development"
slug: phase-3-test
topic: Phase 3 Assessment
subject: web-development
quizType: formal
timeLimit: 45
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt Phase 3 test covering Weeks 9–15 — HTTP, HTML and CSS, JavaScript and the DOM, async JavaScript, React, Node.js and Express, databases from Node, authentication, CI and deployment. 30 questions, 45 minutes.
---
Q: A user types www.example.com into the browser for the first time. What does DNS do in this process?
A) Encrypts the connection between browser and server
*B) Translates the domain name into the IP address of the server
C) Sends the HTML page to the browser
D) Caches the page's images
Explanation: DNS resolves names to IP addresses. TLS handles encryption and the web server sends the HTML.

Q: Which status code tells a browser that a page has moved permanently to a new URL?
A) 200
*B) 301
C) 304
D) 404
Explanation: 301 Moved Permanently redirects and lets clients update their links. 304 means "not modified, use your cached copy".

Q: A paragraph `<p class="note">` sits inside `<div class="card">`, which is inside `<section id="main">`. Two rules set its colour: `#main p { color: blue; }` and `.card p.note { color: green; }`. Neither uses !important. Which colour is shown?
*A) Blue, because an ID selector is more specific than any number of class selectors
B) Green, because it has more selectors
C) Green, because it appears later in the stylesheet
D) Black, because the rules cancel out
Explanation: Specificity compares IDs first. #main p has one ID; .card p.note has none, so blue wins regardless of order.

Q: An element has `width: 200px; padding: 20px; border: 5px solid;` and the default `box-sizing: content-box`. How wide is it on screen (excluding margin)?
A) 200px
B) 225px
*C) 250px
D) 240px
Explanation: Content 200 + padding 2 × 20 + border 2 × 5 = 250px. With box-sizing: border-box it would be 200px.

Q: Which practices improve the accessibility of a registration form? (Select all that apply.)
*A) Connecting each input to a `<label>` with matching for and id attributes
*B) Giving informative images meaningful alt text
C) Using a clickable `<div>` instead of a `<button>` for submit
*D) Using headings in order (one h1, then h2s) to structure the page
Explanation: Labels, alt text and heading structure help screen-reader and keyboard users. A div is not focusable or announced as a button.

Q: In mobile-first CSS, what does `@media (min-width: 768px) { .grid { grid-template-columns: repeat(3, 1fr); } }` do?
A) Applies three columns only on screens narrower than 768px
*B) Keeps the base (mobile) styles for small screens and switches to three columns at 768px and wider
C) Hides the grid on mobile
D) Forces every screen to be at least 768px wide
Explanation: Mobile-first writes base styles for small screens and adds min-width queries as the screen grows.

Q: What does `console.log(0 == '', 0 === '')` print?
A) false false
*B) true false
C) true true
D) false true
Explanation: == converts types, so '' becomes 0 and the values are equal. === also compares types, so it is false.

Q: What does `[1, 2, 3, 4, 5].filter(n => n % 2).map(n => n * 10)` return?
A) [20, 40]
*B) [10, 30, 50]
C) [10, 20, 30, 40, 50]
D) [1, 3, 5]
Explanation: n % 2 is 1 (truthy) for odd numbers, so filter keeps 1, 3 and 5; map multiplies each by 10.

Q: What is the result of `[3, 5, 2].reduce((total, n) => total + n, 10)`?
A) 10
B) 10352
*C) 20
D) 30
Explanation: reduce starts from the initial value 10 and adds 3, 5 and 2.

Q: Given `const user = { name: 'Asha' };`, which statement is true?
A) `user.name = 'Ravi'` throws a TypeError because user is const
*B) `user.name = 'Ravi'` works, but `user = { name: 'Ravi' }` throws a TypeError
C) Both statements work
D) Both statements throw
Explanation: const prevents reassigning the variable, not changing the object it points to.

Q: A to-do list has hundreds of `<li>` items that are added and removed often. What is event delegation?
A) Adding a separate click listener to every li when it is created
*B) Adding one listener to the parent `<ul>` and using event.target (for example with closest) to find which item was clicked
C) Using setTimeout to delay click handling
D) Calling preventDefault on every click
Explanation: Events bubble up to the parent, so one listener handles current and future items.

Q: What is printed by: `console.log('A'); setTimeout(() => console.log('B'), 0); Promise.resolve().then(() => console.log('C')); console.log('D');`
A) A B C D
B) A C D B
*C) A D C B
D) A D B C
Explanation: Synchronous code runs first (A, D). Promise callbacks are microtasks and run before timer callbacks (macrotasks), so C comes before B.

Q: What does `for (var i = 0; i < 3; i++) { setTimeout(() => console.log(i), 0); }` print, and what change makes it print 0 1 2?
A) 0 1 2; no change needed
*B) 3 3 3; declare the loop variable with let instead of var
C) 3 3 3; use setInterval instead
D) undefined three times; add return
Explanation: var creates one function-scoped i shared by all callbacks, which is 3 when they run. let creates a new binding per iteration.

Q: `await Promise.all([fetchUser(), fetchOrders(), fetchCart()])` is used and fetchOrders() rejects. What happens?
A) The result contains two values and one undefined
*B) The awaited Promise.all rejects with fetchOrders' error, so the code jumps to the nearest catch
C) The other two requests are retried
D) Promise.all waits forever
Explanation: Promise.all rejects as soon as any input rejects. Use Promise.allSettled to get every outcome.

Q: Which packages normally belong in devDependencies rather than dependencies for a Vite + React project? (Select all that apply.)
*A) vite
*B) eslint
C) react
*D) vitest
Explanation: Build, lint and test tools are only needed during development and CI; react is part of the app that ships to users.

Q: A React list renders `items.map((item, index) => <Row key={index} item={item} />)`, and users can delete and reorder rows. Why is this a problem?
A) Index keys are not allowed by React
B) It makes the list render twice
*C) When items move, the same key points to a different item, so React can reuse the wrong component state
D) Keys must always be strings
Explanation: Keys should be stable and unique per item, such as item.id, so React matches components to the right data.

Q: Inside a click handler, `setCount(count + 1); setCount(count + 1);` runs once, with count equal to 0. What is count after the re-render?
*A) 1
B) 2
C) 0
D) It throws an error
Explanation: Both calls use the same count value from this render. Use the updater form, setCount(c => c + 1), to add 2.

Q: What does `useEffect(() => { loadItems(); }, [])` do?
A) Runs loadItems before every render
*B) Runs loadItems after the first render only (development StrictMode runs effects twice on mount to find bugs)
C) Runs loadItems every time any state changes
D) Never runs, because the dependency array is empty
Explanation: An empty dependency array means the effect has no dependencies that can change, so it runs after mount.

Q: Two sibling components, SearchBox and ResultsList, both need the current search text. Following React's data flow, where should the state live?
A) In SearchBox, read by ResultsList through a global variable
B) In both components separately, kept in sync with useEffect
*C) In their closest common parent, passed down as props (with a setter passed to SearchBox)
D) In localStorage
Explanation: Lift state up to the lowest common parent so there is one source of truth.

Q: Which statements about React Router and shared state are correct? (Select all that apply.)
*A) `useParams()` returns route params such as id as strings
*B) A reducer used with useReducer must return new state without mutating the old state
C) A ProtectedRoute alone is enough to keep data private
*D) Filters that should survive a refresh and be shareable belong in the query string
Explanation: Client-side route protection is only UX; the server must enforce access.

Q: In React Testing Library, which query best matches how a user finds a "Save" button?
*A) `screen.getByRole('button', { name: /save/i })`
B) `container.querySelector('.btn-primary')`
C) `screen.getByTestId('save')`
D) `document.getElementsByTagName('button')[0]`
Explanation: Role and accessible name reflect what users and assistive technology see, and keep tests independent of CSS classes.

Q: In Express, what does calling `next()` inside a middleware do?
A) Sends a 200 response
*B) Passes control to the next matching middleware or route handler
C) Restarts the server
D) Skips all remaining routes and returns 404
Explanation: Middleware runs in registration order; next() moves on, and next(err) jumps to the error handler.

Q: In a routes → controllers → services structure, where should the rule "a student can apply to a job only once" be enforced?
A) In the route file, as part of the URL
B) Only in the React component that shows the Apply button
*C) In the service layer, ideally backed by a UNIQUE constraint in the database
D) In the CORS configuration
Explanation: Business rules belong in services, close to the data, and a database constraint makes the rule hold even under concurrent requests.

Q: Which pairs of situation and status code are correct? (Select all that apply.)
*A) Successful DELETE with no response body: 204
*B) Request body fails validation: 400
C) Logged-in user tries to edit someone else's record: 401
*D) Signing up with an email that already exists: 409
Explanation: Editing someone else's record is an authorisation failure (403). 401 is for missing or invalid credentials.

Q: Why does a Node.js API use a connection pool such as `new pg.Pool()` instead of opening a new database connection for every request?
A) PostgreSQL allows only one connection per application
*B) Opening connections is slow, so reusing a limited set of open connections is faster and protects the database from too many connections
C) Pools encrypt queries automatically
D) Pools remove the need for parameterised queries
Explanation: A pool lends existing connections to queries and caps the total number open.

Q: A migration file 001_create_users.sql has already been applied to the shared development and production databases. You need a new column. What should you do?
A) Edit 001_create_users.sql and re-run all migrations
*B) Add a new migration such as 004_add_phone_to_users.sql
C) Drop the database and recreate it
D) Add the column by hand in production only
Explanation: Applied migrations are history. A new numbered migration keeps every database in step.

Q: Which statements about authentication in your API are correct? (Select all that apply.)
*A) Passwords are stored as bcrypt hashes, and login uses bcrypt.compare
*B) A JWT's payload can be read by anyone who has the token, so it must not contain secrets
C) A JWT is valid only on the device that requested it
*D) The login error should be the same whether the email is unknown or the password is wrong
Explanation: Hash passwords, keep JWT payloads non-sensitive, and do not reveal which emails are registered.

Q: Your Express app is deployed to a host that assigns the port at runtime. Which line is correct?
A) `app.listen(3000)`
*B) `app.listen(process.env.PORT ?? 4000)`
C) `app.listen(import.meta.env.PORT)`
D) `app.listen('localhost')`
Explanation: Hosts pass the port in the PORT environment variable; a fallback keeps local development working. import.meta.env is a Vite (front-end) feature.

Q: A GitHub Actions workflow needs a token for an external service during CI. Where should the token be kept?
A) Directly in the workflow YAML file
B) In a committed .env file
*C) In the repository's Actions secrets, referenced from the workflow
D) In the README so teammates can find it
Explanation: Repository secrets are encrypted and masked in logs. Anything in committed files is visible to everyone with access to the repository.

Q: Which checks belong in a CI workflow that runs on every pull request for a React + Express project? (Select all that apply.)
*A) Install dependencies with npm ci
*B) Run the linter
*C) Run the test suite once (for example npx vitest run)
D) Deploy the pull request's code to the production database
Explanation: CI should verify the code without touching production. Deployment of main is a separate, controlled step.
