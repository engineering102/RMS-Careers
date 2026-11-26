---
type: notes
title: "W10 · S2 · Arrays, Objects and Data Transformation"
slug: w10-s2-arrays-objects
topic: Arrays, Objects & Array Methods
subject: programming-fundamentals
minutes: 35
description: Arrays and objects in JavaScript, the array methods map, filter, reduce, find and sort, plus destructuring, spread and rest, template literals and optional chaining, practised on a JSON dataset.
---
# Arrays, objects and data transformation

Most front-end code is the same job over and over: take data from somewhere (an API, a form, localStorage),
**reshape it**, and show it. This session gives you the tools for the reshaping.

## Arrays

```js
const marks = [78, 92, 65];
marks.push(88);              // add at the end      → [78, 92, 65, 88]
marks.pop();                 // remove from the end → 88
marks.unshift(50);           // add at the start    → [50, 78, 92, 65]
marks.shift();               // remove from the start
console.log(marks.length);   // 3
console.log(marks.includes(92)); // true
console.log(marks.indexOf(65));  // 2
console.log(marks.at(-1));       // 65 (negative index, like Python's marks[-1])
console.log(marks.slice(0, 2));  // [78, 92]  (a copy, like Python's marks[0:2])
console.log(marks.join(" | "));  // "78 | 92 | 65"
```

`marks[-1]` does **not** work like Python; it is `undefined`. Use `.at(-1)`.

## Objects

An object is a set of key–value pairs, similar to a Python dict:

```js
const student = {
  name: "Asha",
  branch: "CSE",
  cgpa: 8.4,
  skills: ["Python", "SQL"],
  address: { city: "Hyderabad" },
};

console.log(student.name);           // dot notation
console.log(student["branch"]);      // bracket notation (needed when the key is in a variable)
student.year = 3;                    // add a property
delete student.cgpa;                 // remove one

console.log(Object.keys(student));   // ["name", "branch", "skills", "address", "year"]
for (const [key, value] of Object.entries(student)) {
  console.log(key, value);
}
```

**Objects and arrays are passed by reference.** Assigning one to another variable does not copy it:

```js
const a = { n: 1 };
const b = a;
b.n = 2;
console.log(a.n);   // 2 — a and b are the same object
```

## The array methods that matter

All of these take a function (usually an arrow function) and **do not change the original array**, except `sort`.

```js
const students = [
  { name: "Asha", branch: "CSE", cgpa: 8.4 },
  { name: "Ravi", branch: "ECE", cgpa: 7.1 },
  { name: "Meena", branch: "CSE", cgpa: 9.0 },
  { name: "Kiran", branch: "MECH", cgpa: 6.8 },
];
```

| Method | Returns | Example |
|---|---|---|
| `map(fn)` | a new array, same length, each item transformed | `students.map((s) => s.name)` → `["Asha", "Ravi", "Meena", "Kiran"]` |
| `filter(fn)` | a new array of items where `fn` returns truthy | `students.filter((s) => s.cgpa >= 8)` → Asha, Meena |
| `find(fn)` | the **first** matching item, or `undefined` | `students.find((s) => s.branch === "ECE")` → Ravi |
| `findIndex(fn)` | its index, or `-1` | |
| `some(fn)` / `every(fn)` | `true` / `false` | `students.some((s) => s.cgpa > 9)` → `false` |
| `reduce(fn, start)` | one value built from all items | totals, counts, grouping |
| `forEach(fn)` | `undefined` | side effects only, such as logging |

### reduce

`reduce` walks the array carrying an **accumulator**:

```js
const total = students.reduce((acc, s) => acc + s.cgpa, 0);
const average = total / students.length;          // 7.825

// Count students per branch
const perBranch = students.reduce((acc, s) => {
  acc[s.branch] = (acc[s.branch] ?? 0) + 1;
  return acc;                                     // always return the accumulator
}, {});
console.log(perBranch);                           // { CSE: 2, ECE: 1, MECH: 1 }
```

Always pass the starting value (`0`, `{}`, `[]`). Without it, `reduce` uses the first element and throws on an empty
array.

### Chaining

```js
const topCseNames = students
  .filter((s) => s.branch === "CSE")
  .map((s) => `${s.name} (${s.cgpa})`);
console.log(topCseNames); // ["Asha (8.4)", "Meena (9)"]
```

### sort: two traps

```js
console.log([10, 9, 1].sort());              // [1, 10, 9]  — compares as strings!
console.log([10, 9, 1].sort((a, b) => a - b)); // [1, 9, 10]

const byCgpaDesc = [...students].sort((a, b) => b.cgpa - a.cgpa);
const byName = [...students].sort((a, b) => a.name.localeCompare(b.name));
```

1. Without a compare function, `sort` converts items to strings. Always pass one for numbers.
2. `sort` **changes the original array**. Copy first with `[...arr]`, or use `arr.toSorted(fn)`, which returns a new
   array and is available in current browsers and Node 20+.

The compare function returns a negative number if `a` should come first, positive if `b` should, and `0` if they are
equal.

## Destructuring

Pull values out of arrays and objects into variables:

```js
const [first, second] = [78, 92, 65];           // first = 78, second = 92
const { name, branch } = students[0];           // name = "Asha", branch = "CSE"
const { cgpa: score } = students[0];            // rename: score = 8.4
const { city = "Unknown" } = {};                // default value

// In function parameters
function describe({ name, cgpa }) {
  return `${name}: ${cgpa}`;
}
console.log(students.map(describe));
```

## Spread and rest

The same `...` syntax does two opposite jobs.

**Spread** expands an array or object:

```js
const marks = [78, 92, 65];
const more = [...marks, 99];                        // copy + add → [78, 92, 65, 99]
const merged = [...marks, ...[50, 60]];             // join arrays
const updated = { ...students[0], cgpa: 8.6 };      // copy with one field changed
console.log(Math.max(...[3, 9, 4]));                 // 9
```

**Rest** collects the remaining items:

```js
const [top, ...others] = [92, 85, 78];   // top = 92, others = [85, 78]
const { name: n, ...restOfStudent } = students[0];
function sum(...nums) {
  return nums.reduce((a, b) => a + b, 0);
}
console.log(sum(1, 2, 3));                // 6
```

Spread copies are **shallow**: nested arrays and objects are still shared. For a full deep copy of plain data use
`structuredClone(obj)`.

## Optional chaining

Data from APIs often has missing parts. `?.` stops and returns `undefined` instead of throwing:

```js
const user = { profile: null };
console.log(user.profile?.city);              // undefined (no TypeError)
console.log(user.profile?.city ?? "Not set"); // "Not set"
console.log(user.getName?.());                // calls only if getName exists
```

## JSON

JSON is a text format that looks like JavaScript objects but stricter: keys in double quotes, no functions, no
trailing commas.

```js
const text = JSON.stringify(students);          // object → string
const back = JSON.parse(text);                  // string → object
```

You will use these to store data in localStorage (S3) and to read API responses (Week 11).

## Lab: data-transformation kata

Save this as `orders.js` and solve each task with array methods, **no `for` loops**:

```js
const orders = [
  { id: 1, customer: "Asha", city: "Hyderabad", items: [{ name: "Pen", price: 20, qty: 5 }], status: "delivered" },
  { id: 2, customer: "Ravi", city: "Chennai", items: [{ name: "Notebook", price: 60, qty: 3 }, { name: "Pen", price: 20, qty: 2 }], status: "pending" },
  { id: 3, customer: "Meena", city: "Hyderabad", items: [{ name: "Calculator", price: 950, qty: 1 }], status: "delivered" },
  { id: 4, customer: "Kiran", city: "Pune", items: [], status: "cancelled" },
];
```

- [ ] Names of customers with delivered orders.
- [ ] Total value of each order: `[{ id: 1, total: 100 }, ...]` (nested `reduce` inside `map`).
- [ ] Total revenue from delivered orders only.
- [ ] Orders per city as an object: `{ Hyderabad: 2, Chennai: 1, Pune: 1 }`.
- [ ] The most expensive single item across all orders (hint: `flatMap`).
- [ ] Orders sorted by total, highest first, without changing `orders`.
- [ ] Print each order as `` `#1 · Asha · ₹100 · delivered` `` using destructuring and template literals.

## Check yourself

1. What does `[3, 20, 100].sort()` return, and how do you fix it?
2. What is the difference between `find` and `filter`?
3. `const copy = { ...original }` and then `copy.address.city = "Pune"`. Does `original` change? Why?
