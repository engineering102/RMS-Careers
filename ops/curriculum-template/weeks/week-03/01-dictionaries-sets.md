---
type: notes
title: "W3 · S1 · Dictionaries and Sets"
slug: w03-s1-dictionaries-and-sets
topic: Dictionaries & Sets
subject: programming-fundamentals
minutes: 35
description: Dictionary and set operations, comprehensions and iteration patterns, counting and grouping, and how to choose between list, tuple, set and dict, with phone-book and inventory exercises.
---
# Dictionaries and sets

Lists answer "what is at position 3?". Very often you need a different question answered: "what is Asha's phone
number?" or "have I seen this value before?". Dictionaries and sets answer those questions in a single fast lookup.

## Dictionaries

A **dict** maps **keys** to **values**. Keys must be unique and immutable (strings, numbers, tuples); values can be
anything.

```python
phone = {"Asha": "98450 12345", "Ravi": "99000 54321"}

print(phone["Asha"])           # 98450 12345
phone["Meena"] = "90000 11111" # add a new key
phone["Ravi"] = "99000 00000"  # update an existing key
del phone["Asha"]              # remove a key
print(len(phone))              # 2
print("Ravi" in phone)         # True  (checks keys, not values)
```

Since Python 3.7, a dict remembers the **order in which keys were inserted**.

### Reading safely

`phone["Kiran"]` raises `KeyError` if the key is missing. Two safe alternatives:

```python
phone.get("Kiran")              # None
phone.get("Kiran", "unknown")   # "unknown"

if "Kiran" in phone:
    print(phone["Kiran"])
```

### Common methods

| Method | Example | Result / effect |
|---|---|---|
| `keys()` | `phone.keys()` | view of the keys |
| `values()` | `phone.values()` | view of the values |
| `items()` | `phone.items()` | view of `(key, value)` pairs |
| `get(k, default)` | `d.get("x", 0)` | value, or the default if missing |
| `pop(k)` | `d.pop("x")` | remove the key and return its value |
| `update(other)` | `d.update({"a": 1})` | add or overwrite several keys |
| `setdefault(k, v)` | `d.setdefault("x", [])` | return `d[k]`, inserting `v` first if missing |

### Iteration patterns

```python
stock = {"pen": 40, "notebook": 12, "eraser": 0}

for item in stock:                    # keys
    print(item)

for item, qty in stock.items():       # keys and values together
    if qty == 0:
        print(item, "is out of stock")

for item in sorted(stock):            # keys in alphabetical order
    print(item, stock[item])
```

Do not add or remove keys while looping over the same dict; Python raises `RuntimeError`. Loop over a copy instead:
`for item in list(stock):`.

### Counting and grouping

Two patterns you will use constantly, in projects and in DSA.

**Counting** (a frequency map):

```python
words = "to be or not to be".split()
freq = {}
for w in words:
    freq[w] = freq.get(w, 0) + 1
print(freq)   # {'to': 2, 'be': 2, 'or': 1, 'not': 1}
```

**Grouping** (a dict of lists):

```python
students = [("Asha", "CSE"), ("Ravi", "ECE"), ("Meena", "CSE")]
by_branch = {}
for name, branch in students:
    by_branch.setdefault(branch, []).append(name)
print(by_branch)   # {'CSE': ['Asha', 'Meena'], 'ECE': ['Ravi']}
```

The standard library's `collections.Counter` and `collections.defaultdict` do the same jobs; learn the manual
versions first so you understand what they save you.

### Dict comprehensions

```python
squares = {n: n * n for n in range(1, 5)}        # {1: 1, 2: 4, 3: 9, 4: 16}
passed = {name: m for name, m in [("A", 72), ("B", 35)] if m >= 40}   # {'A': 72}
```

## Sets

A **set** is an unordered collection of **unique** values. Use it to remove duplicates and to test membership quickly.

```python
tags = {"python", "git", "python"}
print(tags)              # {'python', 'git'}  (order may differ)
empty = set()            # NOT {} — that is an empty dict

nums = [3, 1, 3, 2, 1]
unique = set(nums)       # {1, 2, 3}
print(len(unique))       # 3
```

| Operation | Operator | Method | Meaning |
|---|---|---|---|
| Union | `a \| b` | `a.union(b)` | in either |
| Intersection | `a & b` | `a.intersection(b)` | in both |
| Difference | `a - b` | `a.difference(b)` | in `a` but not `b` |
| Symmetric difference | `a ^ b` | `a.symmetric_difference(b)` | in exactly one |
| Add / remove | | `a.add(x)`, `a.remove(x)`, `a.discard(x)` | `remove` raises `KeyError` if missing; `discard` does not |

```python
python_club = {"Asha", "Ravi", "Meena"}
web_club = {"Ravi", "Kiran"}
print(python_club & web_club)    # {'Ravi'}
print(python_club - web_club)    # {'Asha', 'Meena'} (order may differ)
```

Set items must be immutable, so you can put tuples in a set but not lists.

## Why dict and set lookups are fast

`x in my_list` checks the items one by one; the time grows with the length of the list. Dicts and sets use a
**hash table**: Python computes a hash of the key and jumps almost directly to where it is stored, so `x in my_set`
takes about the same time whether the set holds ten items or ten million. This week's DSA note puts numbers on that
difference (Big-O).

## Choosing the right collection

| Collection | Ordered? | Mutable? | Duplicates? | Best for |
|---|---|---|---|---|
| `list` | yes | yes | yes | a sequence you iterate, index or sort |
| `tuple` | yes | no | yes | a fixed record; a dict key made of several parts |
| `set` | no | yes | no | uniqueness and fast "have I seen it?" checks |
| `dict` | insertion order | yes | keys unique | looking things up by a key; counting; grouping |

Ask: *Do I look things up by position or by name? Do duplicates matter? Will it change?*

## Lab: phone book and inventory

**Phone book.** A menu program (Week 2 style) that stores contacts in a dict: add, search by name, update, delete,
list all sorted by name. Searching for a missing name prints a friendly message, not a `KeyError`.

**Inventory.** Start from:

```python
inventory = {"pen": 40, "notebook": 12, "stapler": 3}
```

1. Write `restock(inventory, item, qty)` that adds to an existing item or creates a new one.
2. Write `sell(inventory, item, qty)` that refuses to go below zero and returns `True` or `False`.
3. Print every item with quantity under 5 as a "reorder" list.
4. Given two branch inventories, use set operations to list the items stocked in both, and the items only in one.

## Check yourself

1. What is the difference between `d["k"]` and `d.get("k")` when `"k"` is missing?
2. Why does `{}` create a dict, and how do you create an empty set?
3. You need to store each student's marks and look them up by roll number. Which collection, and why?
