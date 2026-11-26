---
type: notes
title: "W1 · S4 · Python First Steps"
slug: w01-s4-python-first-steps
topic: Python Basics
subject: programming-fundamentals
minutes: 35
description: How Python runs code, variables and core types, type conversion, input and output, and arithmetic, comparison and logical operators, with ten warm-up programs.
---
# Python first steps

## How Python runs your code

Python is an **interpreted** language: the `python` program reads your `.py` file and executes it **top to bottom,
one statement at a time**. If line 7 has an error, lines 1–6 have already run.

```bash
python hello.py
```

```python
print("Hello, RMS Careers!")
```

You can also experiment in the **REPL**: type `python` in the terminal, then enter expressions and see results
immediately. Type `exit()` to leave.

## Variables

A variable is a **name that refers to a value**. Python creates it the moment you assign to it.

```python
name = "Asha"
age = 20
cgpa = 8.4
is_placed = False
```

Naming rules: letters, digits and underscores; cannot start with a digit; case-sensitive. Convention: `snake_case`.

## Core types

| Type | Example | Notes |
|---|---|---|
| `int` | `42`, `-7` | whole numbers, no size limit |
| `float` | `3.14`, `2e-3` | decimals; can have tiny rounding errors |
| `str` | `"hi"`, `'hi'` | text; immutable |
| `bool` | `True`, `False` | capitalised |

```python
print(type(42))       # <class 'int'>
print(0.1 + 0.2)      # 0.30000000000000004  (floating-point rounding)
```

## Input and output

`input()` **always returns a string**. Convert it before doing arithmetic.

```python
age = input("Age: ")        # "20" (a string)
age = int(age)              # 20  (an int)
print("Next year you will be", age + 1)
```

Use **f-strings** for readable output:

```python
name = "Asha"
marks = 86.456
print(f"{name} scored {marks:.1f}")   # Asha scored 86.5
```

## Type conversion

```python
int("12")      # 12
float("3.5")   # 3.5
str(99)        # "99"
int(7.9)       # 7   (truncates, does not round)
round(7.5)     # 8
int("abc")     # ValueError
```

## Operators

**Arithmetic**

| Operator | Meaning | Example | Result |
|---|---|---|---|
| `+ - *` | add, subtract, multiply | `7 * 3` | `21` |
| `/` | true division (always float) | `7 / 2` | `3.5` |
| `//` | floor division | `7 // 2` | `3` |
| `%` | remainder (modulo) | `7 % 2` | `1` |
| `**` | power | `2 ** 10` | `1024` |

`%` and `//` are your best friends in DSA: `n % 10` gives the last digit of `n`, and `n // 10` removes it.

**Comparison** (`==`, `!=`, `<`, `<=`, `>`, `>=`) return `True` or `False`.

**Logical**: `and`, `or`, `not`.

```python
age = 20
has_id = True
print(age >= 18 and has_id)   # True
```

Note the difference: `=` assigns, `==` compares.

## Ten warm-up programs (lab)

Write each as its own file in `week-01/programs/` and commit after each one:

1. Print your name, branch and target role on three lines.
2. Simple interest: read principal, rate and time; print `P * R * T / 100`.
3. Celsius to Fahrenheit: `F = C * 9/5 + 32`.
4. Swap two numbers (try `a, b = b, a`).
5. Area and perimeter of a rectangle.
6. Area of a circle (use `3.14159` or `import math; math.pi`).
7. Read a number of seconds; print it as hours, minutes and seconds (use `//` and `%`).
8. Read a three-digit number; print the sum of its digits.
9. Check whether a number is even (print `True` or `False` using `%`).
10. Average of three subject marks, printed with two decimal places.

## Common beginner errors

| Error | Usual cause |
|---|---|
| `TypeError: can only concatenate str (not "int") to str` | forgot `int()` after `input()`, or `"Age: " + 20` |
| `NameError: name 'x' is not defined` | typo, or using a variable before assigning it |
| `IndentationError` | mixed tabs and spaces, or an unexpected indent |
| `ValueError: invalid literal for int()` | converting text like `"abc"` or `"3.5"` with `int()` |

Read the **last line** of an error first; it names the problem. The line above it tells you where.

## Check yourself

1. What does `print(17 // 5, 17 % 5)` print?
2. Why does `input("n: ") + 1` fail?
3. What is the type of `10 / 2`?
