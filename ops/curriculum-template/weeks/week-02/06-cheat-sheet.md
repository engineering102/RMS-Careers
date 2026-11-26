---
type: resource
title: "W2 · Cheat Sheet: Control Flow, Functions, Strings and Lists"
slug: w02-cheat-sheet
topic: Week 2 Reference
subject: programming-fundamentals
minutes: 10
description: One-page reference for Week 2 — conditions and loops, function arguments and scope, string and list methods, debugger keys, this week's deliverable and career task.
---
# Week 2 cheat sheet

## Control flow

```python
if x > 0:            # first true branch wins; order matters
    ...
elif x == 0:
    ...
else:
    ...

for i in range(start, stop, step):   # stop is excluded
    ...
while condition:                     # make sure something changes
    ...
```

| Keyword | Effect |
|---|---|
| `break` | leave the loop now |
| `continue` | skip to the next iteration |
| loop `else:` | runs only if the loop ended **without** `break` |

Falsy values: `False`, `None`, `0`, `0.0`, `""`, `[]`, `()`, `{}`.

## Functions

```python
def f(a, b=2, *args, **kwargs):
    """Docstring: purpose, parameters, return value, example."""
    return a + b          # no return → None

f(1)            # a=1, b=2
f(1, b=5)       # keyword argument
```

- Defaults come after non-defaults. Never use a mutable default (`[]`); use `None`.
- **LEGB**: Local → Enclosing → Global → Built-in.
- Assigning a name inside a function makes it local to that function.
- Tests: `assert` lines under `if __name__ == "__main__":`.

## Strings (immutable)

| Need | Code |
|---|---|
| first / last char | `s[0]` · `s[-1]` |
| slice / reverse | `s[a:b]` · `s[::-1]` |
| clean up | `s.strip()` · `s.lower()` · `s.upper()` |
| words | `s.split()` · `" ".join(words)` |
| search | `"x" in s` · `s.find("x")` (−1 if absent) · `s.count("x")` |
| check | `s.isdigit()` · `s.isalpha()` · `s.startswith("a")` |
| format | `f"{x:.2f}"` · `f"{n:,}"` · `f"{name:<10}"` |

## Lists (mutable) and tuples (immutable)

| Need | Code |
|---|---|
| add | `lst.append(x)` · `lst.insert(i, x)` · `lst.extend(other)` |
| remove | `lst.pop()` · `lst.pop(i)` · `lst.remove(x)` |
| sort | `lst.sort()` (in place, returns `None`) · `sorted(lst)` (new list) |
| copy | `lst.copy()` or `lst[:]` (plain `b = a` is **not** a copy) |
| comprehension | `[x * x for x in nums if x > 0]` |
| grid | `[[0] * cols for _ in range(rows)]` |
| one-item tuple | `(5,)` |

## Debugger (VS Code)

Breakpoint: click the margin · **F5** start/continue · **F10** step over · **F11** step into · **Shift+F11** step
out · **Shift+F5** stop · add expressions in **Watch**.

## Number patterns

```python
n % 10, n // 10                     # last digit, drop last digit
while b: a, b = b, a % b            # gcd ends in a
while d * d <= n: ...               # prime check up to √n
a, b = b, a + b                     # Fibonacci step
```

## This week

| Item | Details |
|---|---|
| **Deliverable** | `/week-02/number_utils.py` module with docstrings and test calls, plus a menu program (Weekly Build WB-02) |
| **Practice quiz** | Python Core: Control Flow, Functions & Strings (untimed, retakes allowed) |
| **Weekly test** | 15 questions on loops, functions, strings and lists, 25 minutes |
| **DSA** | GCD/LCM, prime check and Count Primes (LC 204), Palindrome Number (LC 9), Fibonacci, Armstrong numbers |
| **Career task** | Create LeetCode and HackerRank profiles; start your DSA tracker (problem, pattern, date, revisit) |
