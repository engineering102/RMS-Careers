---
type: notes
title: "W2 · S4 · Lists, Tuples and Debugging"
slug: w02-s4-lists-tuples-debugging
topic: Lists & Debugging
subject: programming-fundamentals
minutes: 40
description: List and tuple operations, slicing, list comprehensions and nested lists, then debugging in VS Code with breakpoints, step over and step into, and watch variables, applied to five broken programs.
---
# Lists, tuples and debugging

## Lists

A **list** is an ordered, **mutable** collection. It can hold any types, and its size changes as you add or remove
items. Lists are the Python equivalent of the "array" in almost every DSA problem.

```python
marks = [78, 92, 65, 88]
print(marks[0], marks[-1])   # 78 88
print(len(marks))            # 4
marks[2] = 70                # lists are mutable
print(marks)                 # [78, 92, 70, 88]
```

Indexing and slicing work exactly as they do for strings: `marks[1:3]` is `[92, 70]` and `marks[::-1]` is a reversed
copy.

### Common operations

| Operation | Example | Effect |
|---|---|---|
| `append(x)` | `marks.append(95)` | add to the end |
| `insert(i, x)` | `marks.insert(0, 50)` | add at index `i` (shifts the rest right) |
| `extend(other)` | `marks.extend([1, 2])` | add every item of another list |
| `pop()` / `pop(i)` | `marks.pop()` | remove and return the last item / item `i` |
| `remove(x)` | `marks.remove(70)` | remove the first occurrence of value `x` (ValueError if absent) |
| `index(x)` | `marks.index(92)` | position of the first `x` |
| `x in lst` | `92 in marks` | `True` / `False` |
| `sort()` | `marks.sort()` | sorts **in place**, returns `None` |
| `sorted(lst)` | `sorted(marks)` | returns a **new** sorted list |
| `reverse()` | `marks.reverse()` | reverses in place |
| `sum`, `min`, `max` | `sum(marks)` | built-ins that work on lists of numbers |

A classic bug: `marks = marks.sort()` sets `marks` to `None`, because `sort()` changes the list and returns nothing.

### Aliasing: two names, one list

```python
a = [1, 2, 3]
b = a          # b refers to the SAME list
b.append(4)
print(a)       # [1, 2, 3, 4]

c = a.copy()   # or a[:] or list(a): a new, separate list
c.append(5)
print(a)       # [1, 2, 3, 4]  unchanged
```

Assignment never copies a list. If you pass a list to a function and the function appends to it, the caller sees
the change.

## Tuples

A **tuple** is an ordered, **immutable** sequence. Use it for a fixed group of values that belong together, such as
a coordinate or a database row.

```python
point = (3, 4)
x, y = point             # unpacking
single = (5,)            # one-item tuple needs a comma; (5) is just the int 5
point[0] = 10            # TypeError: tuples are immutable
```

| | List | Tuple |
|---|---|---|
| Syntax | `[1, 2]` | `(1, 2)` |
| Mutable? | yes | no |
| Typical use | a collection that grows or changes | a fixed record; returning several values |
| Can be a dict key? | no | yes (if its items are immutable) |

## List comprehensions

A comprehension builds a new list from an existing sequence in one readable line.

```python
squares = [n * n for n in range(1, 6)]          # [1, 4, 9, 16, 25]
evens = [n for n in range(10) if n % 2 == 0]     # [0, 2, 4, 6, 8]
names = [s.title() for s in ["asha", "ravi"]]    # ['Asha', 'Ravi']
```

The shape is `[expression for item in sequence if condition]`. It is equivalent to:

```python
evens = []
for n in range(10):
    if n % 2 == 0:
        evens.append(n)
```

Use comprehensions for simple transformations. If you need several lines of logic, a normal loop is clearer.

## Nested lists

A list can contain lists: a simple way to represent a grid or a table of marks.

```python
grid = [
    [1, 2, 3],
    [4, 5, 6],
]
print(grid[1][2])        # 6  (row 1, column 2)

for row in grid:
    for value in row:
        print(value, end=" ")
    print()
```

A common trap when creating a grid:

```python
bad = [[0] * 3] * 2              # two references to the SAME inner list
bad[0][0] = 9
print(bad)                       # [[9, 0, 0], [9, 0, 0]]

good = [[0] * 3 for _ in range(2)]
good[0][0] = 9
print(good)                      # [[9, 0, 0], [0, 0, 0]]
```

## Debugging with the VS Code debugger

Printing variables works, but a **debugger** lets you pause a running program and look inside it.

### Setting up

1. Open your `.py` file in VS Code (the Python extension must be installed).
2. Click in the margin to the left of a line number. A red dot appears: that is a **breakpoint**.
3. Press **F5** (or Run → Start Debugging) and, if VS Code asks, choose the Python debugger and the option to debug the current file.
4. The program runs and pauses **before** executing the breakpoint line.

### Controls

| Action | Key (default) | What it does |
|---|---|---|
| Continue | F5 | run until the next breakpoint |
| Step Over | F10 | run the current line; if it calls a function, run the whole call |
| Step Into | F11 | go inside the function called on the current line |
| Step Out | Shift+F11 | finish the current function and return to the caller |
| Stop | Shift+F5 | end the debugging session |

The **Variables** panel shows every local and global variable. In the **Watch** panel you can add expressions such as
`total / count` or `len(marks)` and see them update after every step. The **Call Stack** shows which function called
which.

### A systematic debugging routine

1. **Reproduce**: find an input that gives the wrong result every time.
2. **Read the error** (if any): last line first, then the line number.
3. **Form a guess**: "I think `total` is wrong after the loop".
4. **Check it**: put a breakpoint where you can test the guess and inspect the variables.
5. **Fix one thing**, re-run the same input, then run your other tests.

## Lab: fix five broken programs

Your tutor will share five programs, each with one bug. Use the debugger (not just print) to find each one, then fix it
and write a one-line commit message naming the bug. Typical bugs look like these:

```python
# 1. Off-by-one: should average all marks
def average(marks):
    total = 0
    for i in range(1, len(marks)):     # skips index 0
        total += marks[i]
    return total / len(marks)

# 2. sort() returns None
def top_mark(marks):
    ordered = marks.sort()
    return ordered[-1]                 # TypeError: 'NoneType' object is not subscriptable

# 3. Accumulator reset inside the loop
def count_passes(marks):
    for m in marks:
        passes = 0                     # should be before the loop
        if m >= 40:
            passes += 1
    return passes
```

For each, set a breakpoint inside the loop, step with F10, and watch the variable that goes wrong.

## Check yourself

1. What is the difference between `marks.sort()` and `sorted(marks)`?
2. After `b = a` and `b.append(1)`, why does `a` change?
3. What does `[c for c in "level" if c != "l"]` produce?
