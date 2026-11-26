---
type: quiz
title: "W11 · Weekly Test: Closures, Async JavaScript, Tooling and Linked Lists"
slug: w11-weekly-test
topic: Week 11 Assessment
subject: web-development
quizType: formal
timeLimit: 25
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt test on scope, closures and this, promises, async/await, the event loop and fetch, npm, Vite and linting, and linked lists. 15 questions, 25 minutes.
---
Q: What does this code print? `console.log(a); var a = 5;`
A) 5
*B) undefined
C) ReferenceError
D) null
Explanation: var declarations are hoisted and initialised to undefined; the assignment stays on its line.

Q: What does this code do? `console.log(b); let b = 5;`
A) Prints undefined
B) Prints 5
*C) Throws a ReferenceError
D) Prints null
Explanation: let and const are in the temporal dead zone until their declaration line runs.

Q: What does `for (var i = 0; i < 3; i++) { setTimeout(() => console.log(i), 0); }` print?
A) 0 1 2
*B) 3 3 3
C) 2 2 2
D) undefined three times
Explanation: var creates one shared i; the callbacks run after the loop ends, when i is 3. With let it would print 0 1 2.

Q: `function make() { let n = 0; return () => ++n; } const f = make(); f(); f(); const g = make();` What do `f()` and `g()` return next?
A) 1 and 1
*B) 3 and 1
C) 3 and 3
D) 2 and 0
Explanation: Each call to make creates its own n. f has already been called twice, so its next call returns 3; g starts fresh.

Q: In an ES module, `const obj = { name: "Asha", hi() { return this.name; } }; const h = obj.hi; h();` What happens?
A) Returns "Asha"
B) Returns undefined
*C) Throws a TypeError because this is undefined
D) Returns the global object's name
Explanation: Modules run in strict mode, so a plain call sets this to undefined and reading this.name throws.

Q: What is the output order? `console.log("A"); setTimeout(() => console.log("B"), 0); Promise.resolve().then(() => console.log("C")); console.log("D");`
A) A B C D
B) A C D B
*C) A D C B
D) A D B C
Explanation: Synchronous code runs first (A, D), then microtasks (C), then timer tasks (B).

Q: `const res = await fetch("/api/users/999")` returns status 404. What happens?
A) The promise rejects and the catch block runs automatically
*B) The promise resolves; res.ok is false and your code must check it
C) res.json() throws immediately
D) fetch retries the request three times
Explanation: fetch only rejects on network failures. HTTP error statuses must be checked with res.ok or res.status.

Q: Which statements about async functions are true? (Select all that apply.)
*A) An async function always returns a promise
*B) await pauses only the async function it is in, not the whole page
C) await can be used inside any normal function
*D) Errors from an awaited promise can be caught with try/catch
Explanation: await is only allowed in async functions (and at the top level of modules).

Q: You need a user's profile and repositories, which do not depend on each other. Which is fastest?
A) await getUser(); then await getRepos();
*B) await Promise.all([getUser(), getRepos()])
C) getUser().then(getRepos)
D) Calling both inside setTimeout
Explanation: Promise.all starts both requests at once and waits for both, instead of one after the other.

Q: Why debounce a search input that calls an API?
A) To make the API return results faster
*B) To send one request after the user pauses typing instead of one per keystroke
C) To cache every response forever
D) To stop the input from accepting fast typing
Explanation: Debouncing waits until typing stops for a set delay, which saves requests and avoids rate limits.

Q: Which files should be committed in a Vite project? (Select all that apply.)
*A) package.json
*B) package-lock.json
C) node_modules/
*D) .env.example
Explanation: node_modules is recreated by npm install. .env.example documents variables without real values.

Q: A teammate stores a paid API key in VITE_API_KEY in a .env.local file that is not committed. Is the key secret?
A) Yes, because .env.local is in .gitignore
*B) No, because Vite builds VITE_ variables into the JavaScript the browser downloads
C) Yes, because Vite encrypts environment variables
D) No, but only in development mode
Explanation: Anything shipped to the browser can be read in DevTools. Secret keys belong on a server.

Q: What is the difference between ESLint and Prettier?
*A) ESLint reports likely bugs and bad patterns; Prettier rewrites code into a consistent format
B) ESLint formats code; Prettier finds bugs
C) Both only format code
D) Prettier is needed to run Vite
Explanation: Use ESLint for correctness and Prettier for layout; they complement each other.

Q: When reversing a linked list in place, why must `nxt = curr.next` come before `curr.next = prev`?
A) It makes the loop run faster
*B) After curr.next is changed, the rest of the list can no longer be reached
C) Python requires variables to be declared first
D) It is not needed; the order does not matter
Explanation: Overwriting next first would lose the pointer to the remaining nodes.

Q: Slow moves one node and fast moves two nodes per step, starting at the head of 1 -> 2 -> 3 -> 4 -> 5, looping while fast and fast.next exist. Where is slow when the loop ends?
A) Node 2
*B) Node 3
C) Node 4
D) Node 5
Explanation: Fast goes 1, 3, 5 and stops; slow goes 1, 2, 3, which is the middle.
