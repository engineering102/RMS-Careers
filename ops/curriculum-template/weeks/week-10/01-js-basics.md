---
type: notes
title: "W10 · S1 · JavaScript Basics for Python Programmers"
slug: w10-s1-js-basics
topic: JavaScript Basics
subject: programming-fundamentals
minutes: 35
description: Modern JavaScript from a Python starting point — let and const, primitive types, operators and the == vs === trap, control flow, functions and arrow functions — with side-by-side ports of Python programs.
---
# JavaScript basics for Python programmers

JavaScript is the only language every browser runs, and with Node.js it also runs servers. You already know how to
program in Python, so this session is mostly about **what is different**. The logic (variables, loops, functions)
carries over directly.

## Where JavaScript runs

- **In the browser**: open DevTools → **Console** and type expressions, or link a file from HTML:

```html
<script src="app.js" defer></script>
```

  `defer` runs the script after the HTML has been parsed, so your code can find page elements.

- **In Node.js**: install the LTS version from nodejs.org, then run `node app.js` in the terminal. Use Node to try
  the examples in this note.

`console.log()` is JavaScript's `print()`.

## Variables: const and let

```js
const name = "Asha";     // cannot be reassigned
let score = 0;           // can be reassigned
score = score + 10;
```

- Use **`const` by default**, and `let` only when the variable must change.
- Do not use `var` in new code. It ignores block scope (more on that in Week 11).
- Both `const` and `let` are **block-scoped**: a variable declared inside `{ }` does not exist outside it.

`const` stops reassignment, not mutation: `const marks = [80, 90]; marks.push(70);` is allowed.

## Primitive types

| Type | Example | Python equivalent |
|---|---|---|
| `number` | `42`, `3.14`, `NaN`, `Infinity` | `int` and `float` together |
| `bigint` | `9007199254740993n` | large `int` |
| `string` | `"hi"`, `'hi'`, `` `hi ${name}` `` | `str` |
| `boolean` | `true`, `false` (lowercase) | `True`, `False` |
| `undefined` | a declared variable with no value | (no direct equivalent) |
| `null` | "intentionally empty" | `None` |
| `symbol` | `Symbol("id")` | (rarely needed) |

Everything else (arrays, objects, functions) is an **object**.

```js
console.log(typeof 42);        // "number"
console.log(typeof "hi");      // "string"
console.log(typeof undefined); // "undefined"
console.log(typeof null);      // "object"  (a historic bug, kept for compatibility)
console.log(7 / 2);            // 3.5  (no integer division operator)
console.log(Math.floor(7 / 2));// 3
console.log(7 % 2);            // 1
console.log(0.1 + 0.2);        // 0.30000000000000004, same as Python
```

### Template literals

Backticks give you Python-style f-strings:

```js
const cgpa = 8.456;
console.log(`${name} has a CGPA of ${cgpa.toFixed(2)}`); // Asha has a CGPA of 8.46
```

## Operators and the equality trap

Arithmetic (`+ - * / % **`) and comparison (`< > <= >=`) behave as in Python. Logical operators are spelt
differently: `&&` (and), `||` (or), `!` (not).

**Equality** is where JavaScript surprises people:

| Expression | Result | Why |
|---|---|---|
| `5 === 5` | `true` | same type, same value |
| `"5" === 5` | `false` | different types |
| `"5" == 5` | `true` | `==` converts types before comparing |
| `0 == false` | `true` | type conversion again |
| `null == undefined` | `true` | a special rule |
| `NaN === NaN` | `false` | NaN is not equal to anything; use `Number.isNaN(x)` |

Rule: **always use `===` and `!==`**.

The `+` operator joins strings if either side is a string:

```js
console.log("5" + 3);   // "53"
console.log("5" - 3);   // 2   (- only works on numbers, so "5" is converted)
console.log(Number("5") + 3); // 8
```

### Truthy and falsy

In an `if`, these values count as false: `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`. Everything
else is truthy, **including `[]` and `{}`** (unlike Python, where empty lists are falsy). To test for an empty
array, check `arr.length === 0`.

### ?? and ||

```js
const pageSize = userInput || 10;   // 10 if userInput is ANY falsy value, including 0
const limit = userInput ?? 10;      // 10 only if userInput is null or undefined
```

Use `??` when `0` or `""` are valid values.

## Control flow

```js
const marks = 72;
if (marks >= 90) {
  console.log("A");
} else if (marks >= 75) {
  console.log("B");
} else {
  console.log("C");
}

const status = marks >= 40 ? "pass" : "fail";   // ternary: Python's "x if cond else y"

for (let i = 0; i < 3; i++) console.log(i);     // 0 1 2

const subjects = ["DSA", "DBMS", "OS"];
for (const s of subjects) console.log(s);       // like Python's "for s in subjects"

let n = 1234;
while (n > 0) {
  n = Math.floor(n / 10);
}

switch (status) {
  case "pass":
    console.log("Well done");
    break;                                      // without break, execution falls through
  default:
    console.log("Try again");
}
```

Careful: `for...of` loops over **values**. `for...in` loops over **keys** (property names); do not use it on arrays.

## Functions

```js
// Function declaration: can be called before the line where it is written
function area(width, height = 1) {
  return width * height;
}

// Arrow functions: short, common for callbacks
const square = (x) => x * x;           // single expression: implicit return
const add = (a, b) => {
  const sum = a + b;
  return sum;                          // with braces you must write return
};

console.log(area(3, 4), area(5), square(6), add(2, 3)); // 12 5 36 5
```

- Missing arguments become `undefined`; extra arguments are ignored. Default values (`height = 1`) fill the gap.
- A function without `return` returns `undefined`.
- Functions are values: you can store them in variables and pass them to other functions, exactly like Python.

## Python to JavaScript at a glance

| Python | JavaScript |
|---|---|
| `print(x)` | `console.log(x)` |
| `len(s)` | `s.length` |
| `s.upper()` | `s.toUpperCase()` |
| `s.strip()` | `s.trim()` |
| `s.split(",")` | `s.split(",")` |
| `int("42")` | `Number("42")` or `parseInt("42", 10)` |
| `str(42)` | `String(42)` |
| `for i in range(5)` | `for (let i = 0; i < 5; i++)` |
| `x // y` | `Math.floor(x / y)` |
| `None` | `null` |
| `and / or / not` | `&& / \|\| / !` |

## Worked port: digit sum and reverse

Python (Week 1):

```python
n = 1234
total, rev = 0, 0
while n > 0:
    digit = n % 10
    total += digit
    rev = rev * 10 + digit
    n //= 10
print(total, rev)
```

JavaScript:

```js
let n = 1234;
let total = 0;
let rev = 0;
while (n > 0) {
  const digit = n % 10;
  total += digit;
  rev = rev * 10 + digit;
  n = Math.floor(n / 10);   // no // operator in JS
}
console.log(total, rev);    // 10 4321
```

The most common porting bug is forgetting that `/` always gives a decimal: `n / 10` never reaches 0 cleanly, and the
loop runs far longer than you expect.

## Lab: port five Python programs

Create `week-10/js-basics/` and port these from your earlier weeks, each in its own `.js` file run with Node:

- [ ] Temperature converter with a function and a default parameter.
- [ ] Grade calculator using `if / else if`.
- [ ] Digit sum and reverse (the worked port, written without looking).
- [ ] Fizz Buzz from 1 to 30 using a `for` loop and a `switch (true)` or `if` chain.
- [ ] Prime checker as an arrow function `isPrime(n)`, tested on 0, 1, 2, 17 and 21.

Use `const` everywhere you can, `===` only, and template literals for output.

## Check yourself

1. What do `"7" + 1` and `"7" - 1` evaluate to, and why are they different?
2. A function is called with `config.retries || 3` and the user sets retries to `0`. What value is used? What
   should you write instead?
3. What is the difference between `for (const x of arr)` and `for (const x in arr)`?
