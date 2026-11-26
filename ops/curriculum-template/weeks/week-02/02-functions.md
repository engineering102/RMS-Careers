---
type: notes
title: "W2 · S2 · Functions: Parameters, Return Values and Scope"
slug: w02-s2-functions
topic: Functions
subject: programming-fundamentals
minutes: 35
description: Defining functions with def, positional, default and keyword arguments, *args and **kwargs, return values, the LEGB scope rule and docstrings, then refactoring Week 1 programs into functions.
---
# Functions: parameters, return values and scope

A **function** is a named block of code that does one job. You write it once and call it whenever you need that job
done. Functions make programs shorter, easier to test and easier to read, and every DSA problem on LeetCode asks you
to complete a function.

## Defining and calling

```python
def area_of_rectangle(length, width):
    return length * width

result = area_of_rectangle(4, 5)
print(result)          # 20
```

- `def` starts the definition; `length` and `width` are **parameters** (names inside the function).
- `4` and `5` are **arguments** (the actual values passed in).
- `return` sends a value back to the caller and **ends the function immediately**.

### return versus print

This is the most common beginner confusion. `print` shows a value on the screen; `return` hands it back so the caller
can use it.

```python
def add_print(a, b):
    print(a + b)

def add_return(a, b):
    return a + b

x = add_print(2, 3)    # shows 5, but x is None
y = add_return(2, 3)   # shows nothing, y is 5
print(x, y)            # None 5
```

A function with no `return` (or a bare `return`) returns `None`. As a rule: **functions compute and return; the main
program prints.**

A function can return several values as a tuple:

```python
def min_max(a, b, c):
    return min(a, b, c), max(a, b, c)

low, high = min_max(7, 2, 9)   # low = 2, high = 9
```

## Ways to pass arguments

| Kind | Example definition | Example call |
|---|---|---|
| Positional | `def power(base, exp)` | `power(2, 10)` |
| Keyword | same | `power(exp=10, base=2)` |
| Default value | `def power(base, exp=2)` | `power(5)` gives 25 |
| Variable positional | `def total(*nums)` | `total(1, 2, 3)` |
| Variable keyword | `def profile(**info)` | `profile(name="Asha", city="Pune")` |

```python
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

print(greet("Ravi"))                    # Hello, Ravi!
print(greet("Ravi", greeting="Hi"))     # Hi, Ravi!
```

Rules: parameters with defaults must come **after** those without, and in a call, positional arguments must come
**before** keyword arguments.

### *args and **kwargs

`*args` collects extra positional arguments into a **tuple**; `**kwargs` collects extra keyword arguments into a
**dict**. The names `args` and `kwargs` are only convention; the `*` and `**` do the work.

```python
def total(*nums):
    s = 0
    for n in nums:
        s += n
    return s

print(total(1, 2, 3, 4))       # 10

def describe(**info):
    for key, value in info.items():
        print(f"{key}: {value}")

describe(name="Asha", branch="CSE", year=2)
```

### A trap: mutable default values

A default value is created **once**, when the function is defined, not on every call.

```python
def add_item(item, items=[]):     # bug
    items.append(item)
    return items

print(add_item("a"))   # ['a']
print(add_item("b"))   # ['a', 'b']  the same list is reused
```

The fix is to use `None` as the default and create the list inside:

```python
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```

## Scope: the LEGB rule

When Python sees a name, it looks for it in this order:

| Letter | Scope | Example |
|---|---|---|
| **L** | Local: inside the current function | a parameter, or a variable assigned in the function |
| **E** | Enclosing: inside an outer function (for nested functions) | a variable of the outer `def` |
| **G** | Global: at the top level of the file | a variable defined outside every function |
| **B** | Built-in: provided by Python | `len`, `print`, `range` |

```python
rate = 10            # global

def interest(p):
    years = 2        # local
    return p * rate * years / 100

print(interest(1000))   # 200.0
print(years)            # NameError: years is local to interest()
```

Assigning to a name inside a function makes it **local** to that function, even if a global with the same name exists:

```python
count = 0

def increment():
    count = count + 1    # UnboundLocalError

increment()
```

Python decides `count` is local (because it is assigned), then fails because the local has no value yet. You *could*
write `global count`, but the cleaner fix is to pass the value in and return the new one:

```python
def increment(count):
    return count + 1

count = increment(count)
```

Also avoid naming your own variables `list`, `sum`, `max` or `input`: that hides the built-in for the rest of the scope.

## Docstrings

A **docstring** is a string written as the first statement of a function. It documents what the function does, and
tools (including VS Code hovers and `help()`) display it.

```python
def gcd(a, b):
    """Return the greatest common divisor of a and b.

    Uses Euclid's algorithm. Works for non-negative integers.

    Example:
        >>> gcd(12, 18)
        6
    """
    while b:
        a, b = b, a % b
    return a

help(gcd)
```

A good docstring states the purpose, the parameters, the return value and one example. Your Week 2 deliverable
(`number_utils.py`) requires one for every function.

## Testing a function with assert and __main__

`assert condition` does nothing if the condition is true and raises `AssertionError` if it is false. Put quick tests
under `if __name__ == "__main__":` so they run when you execute the file directly, but not when another file imports it.

```python
def is_even(n):
    """Return True if n is even."""
    return n % 2 == 0

if __name__ == "__main__":
    assert is_even(4)
    assert not is_even(7)
    assert is_even(0)
    print("All tests passed")
```

## Lab: refactor Week 1 into functions

Take at least five of your ten warm-up programs from Week 1 and rewrite each as a function:

1. Each function takes its inputs as **parameters** and **returns** the result (no `input()` or `print()` inside).
2. Add a docstring with an example.
3. Add two or more `assert` tests under `if __name__ == "__main__":`.
4. Write a small menu (from S1) that reads input, calls the functions and prints the results.

Example target shape:

```python
def simple_interest(principal, rate, years):
    """Return simple interest for the given principal, annual rate (%) and years."""
    return principal * rate * years / 100

if __name__ == "__main__":
    assert simple_interest(1000, 10, 2) == 200
    print("ok")
```

## Check yourself

1. What does a function return if it has no `return` statement?
2. Why does `def f(a=1, b):` fail?
3. A function assigns `total = 0` inside it. Can code outside the function read `total`? Why or why not?
