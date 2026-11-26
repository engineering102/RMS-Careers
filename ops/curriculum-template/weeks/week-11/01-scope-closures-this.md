---
type: notes
title: "W11 · S1 · Scope, Hoisting, Closures, this, Classes and Modules"
slug: w11-s1-scope-closures-this
topic: Scope, Closures & this
subject: programming-fundamentals
minutes: 40
description: How JavaScript decides which variable a name refers to, why hoisting and the temporal dead zone exist, how closures remember values, how this is set, and how prototypes, classes and ES modules organise code.
---
# Scope, hoisting, closures, this, classes and modules

These are the JavaScript topics interviewers love, because they reveal whether you understand the language or only
copy patterns. Each one is small once you see the rule.

## Scope

**Scope** is where a name is visible. JavaScript has:

- **global scope**: top level of a classic script;
- **module scope**: top level of an ES module file (each module has its own);
- **function scope**: inside a function;
- **block scope**: inside `{ }` for `let`, `const` and `class`.

```js
const site = "RMS";          // visible everywhere in this file

function greet() {
  const message = "Hello";   // visible only inside greet
  if (true) {
    const inner = "block";   // visible only inside this if-block
    var leaky = "function";  // var ignores blocks: visible in the whole function
  }
  console.log(message, leaky); // Hello function
  // console.log(inner);       // ReferenceError: inner is not defined
}
greet();
```

Scope is **lexical**: it is decided by where code is **written**, not where it is called. A function looks up a name in
its own scope, then the scope it was written inside, and so on outwards (the **scope chain**).

## Hoisting and the temporal dead zone

Before running a scope, JavaScript registers every declaration in it. What you can do before the declaration line
depends on the kind:

| Declaration | Before its line |
|---|---|
| `function f() {}` | fully usable: you can call it |
| `var x` | exists with value `undefined` |
| `let x` / `const x` / `class C` | exists but cannot be touched: `ReferenceError` (the **temporal dead zone**) |

```js
console.log(sum(2, 3));   // 5: function declarations are hoisted completely
function sum(a, b) { return a + b; }

console.log(a);           // undefined: var is hoisted, the assignment is not
var a = 1;

// console.log(b);        // ReferenceError: Cannot access 'b' before initialization
let b = 2;
```

The TDZ is a feature: it turns "used before set" bugs into loud errors. One more reason to use `let` and `const`.

## Closures

A **closure** is a function together with the variables from the scope where it was created. The function keeps
access to those variables **even after the outer function has returned**.

```js
function makeCounter() {
  let count = 0;               // private: nothing outside can reach it directly
  return {
    increment: () => ++count,
    current: () => count,
  };
}

const c1 = makeCounter();
const c2 = makeCounter();
c1.increment();
c1.increment();
c2.increment();
console.log(c1.current(), c2.current()); // 2 1  (each call made its own count)
```

Closures are everywhere in front-end code: event handlers that remember an id, `setTimeout` callbacks, and React
hooks (Week 12).

### A practical closure: debounce

WB-11 needs a search box that waits until the user stops typing. That is a closure over a timer id:

```js
function debounce(fn, delay = 400) {
  let timerId;
  return (...args) => {
    clearTimeout(timerId);                         // cancel the previous pending call
    timerId = setTimeout(() => fn(...args), delay);
  };
}

const search = debounce((text) => console.log("search for", text));
search("r"); search("re"); search("rea"); search("react");
// after 400 ms, only: search for react
```

### The classic loop puzzle

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log("var", i), 0);
}
for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log("let", j), 0);
}
// var 3, var 3, var 3, let 0, let 1, let 2
```

With `var` there is **one** `i` shared by all three callbacks, and by the time they run the loop has finished and
`i` is 3. With `let`, each iteration gets a **new** `j`, so each closure remembers its own value.

## this

`this` is **not** decided by where a function is written. For normal functions it is decided by **how the function is
called**:

| Call | `this` is |
|---|---|
| `obj.method()` | `obj` (the object before the dot) |
| `fn()` (plain call) | `undefined` in strict mode (modules and classes are always strict); the global object in old sloppy scripts |
| `new Fn()` | the new object being created |
| `fn.call(x)` / `fn.apply(x)` / `fn.bind(x)` | `x` |
| an **arrow function** | whatever `this` was where the arrow was written (it has no `this` of its own) |

```js
"use strict";
const student = {
  name: "Asha",
  hello() { return `Hi, ${this.name}`; },
};

console.log(student.hello());     // "Hi, Asha"
const loose = student.hello;
// loose();                       // TypeError: this is undefined, so this.name fails
const bound = student.hello.bind(student);
console.log(bound());              // "Hi, Asha"
```

The common bug: passing a method as a callback (`button.addEventListener("click", student.hello)`) detaches it from
its object. Fix it with an arrow wrapper, `() => student.hello()`, or with `bind`.

Rule of thumb: use **method syntax** (`hello() {}`) for object and class methods, and **arrow functions** for
callbacks inside them, so the callback keeps the method's `this`.

## Prototypes and classes

Every JavaScript object has a hidden link to another object, its **prototype**. When a property is not found on the
object, JavaScript looks it up on the prototype, then the prototype's prototype, and so on (the **prototype chain**).
That is how all arrays share `map` and `filter`: they live once on `Array.prototype`.

`class` syntax is a cleaner way to set up prototypes; methods go on the prototype automatically:

```js
class Account {
  #balance = 0;                         // private field: only code inside the class can read it

  constructor(owner) {
    this.owner = owner;
  }

  deposit(amount) {
    if (amount <= 0) throw new Error("Amount must be positive");
    this.#balance += amount;
    return this;                        // allows chaining
  }

  get balance() {                       // read with acc.balance, no parentheses
    return this.#balance;
  }
}

class SavingsAccount extends Account {
  constructor(owner, rate) {
    super(owner);                       // must call super before using this
    this.rate = rate;
  }

  addInterest() {
    return this.deposit(this.balance * this.rate);
  }
}

const acc = new SavingsAccount("Asha", 0.04);
acc.deposit(1000).addInterest();
console.log(acc.balance);                                   // 1040
console.log(Object.getPrototypeOf(acc) === SavingsAccount.prototype); // true
```

Compare with your Week 4 Python classes: `constructor` is `__init__`, `this` is `self` (but implicit), `extends` is
inheritance, and `#field` is truly private (Python's `_field` is only a convention).

## ES modules

Split code into files that **export** what others may use and **import** what they need:

```js
// api.js
export const BASE_URL = "https://api.github.com";
export async function getUser(name) { /* ... */ }

// ui.js
export default function renderUser(user) { /* ... */ }

// main.js
import renderUser from "./ui.js";                 // default import: any name you like
import { getUser, BASE_URL } from "./api.js";     // named imports: exact names
```

```html
<script type="module" src="main.js"></script>
```

- Module scripts are deferred automatically and run in strict mode.
- Each module has its own scope: top-level variables are not global.
- In the browser, the path needs the `.js` extension (`./api.js`). Vite (S3) relaxes some of these rules.
- Opening the HTML file directly (`file://`) blocks modules; serve it with a local server such as VS Code's Live
  Server extension, or Vite.

## Lab: closure and this puzzles

Predict each output **on paper first**, then run it in Node or the browser console, and explain every mistake in a
comment.

- [ ] The `var` / `let` loop puzzle above, then a version that fixes the `var` loop without changing `var`.
- [ ] Write `once(fn)`: returns a function that calls `fn` only the first time and returns that first result on every
      later call.
- [ ] Write `memoize(fn)` for a one-argument function using a `Map` inside a closure; time it on a slow Fibonacci.
- [ ] Create an object with a method that uses `setTimeout` to print `this.name` after one second. Make it work with an
      arrow function, then break it with a regular `function` callback and explain why.
- [ ] Rewrite your Week 4 Python `BankAccount` (or similar) class in JavaScript with a private field, a getter and a
      subclass.

## Check yourself

1. Why does `console.log(x); let x = 1;` throw an error, but `console.log(y); var y = 1;` print `undefined`?
2. In your own words, what does a closure "remember"?
3. `setTimeout(obj.print, 1000)` prints `undefined` for `this.name`. Give two ways to fix it.
