---
type: resource
title: "W4 · Cheat Sheet: OOP in Python, Mini Project 1 and Arrays"
slug: w04-cheat-sheet
topic: Week 4 Reference
subject: programming-fundamentals
minutes: 10
description: One-page reference for Week 4 — class syntax, the four OOP pillars, properties and abstract classes, JSON persistence, array patterns, the Phase 1 test, Mini Project 1 and the career task.
---
# Week 4 cheat sheet

## Class syntax

```python
class Account:
    rate = 0.04                          # class attribute (shared)

    def __init__(self, owner, balance=0):
        self.owner = owner               # instance attributes (per object)
        self._balance = balance          # _ = internal by convention

    @property
    def balance(self):                   # read as acc.balance
        return self._balance

    def deposit(self, amount):           # method: first parameter is self
        if amount <= 0:
            raise ValueError("amount must be positive")
        self._balance += amount

    @classmethod
    def from_dict(cls, d):               # alternative constructor
        return cls(d["owner"], d["balance"])

    def to_dict(self):
        return {"owner": self.owner, "balance": self._balance}

    def __str__(self):  return f"{self.owner}: {self._balance}"        # print()
    def __repr__(self): return f"Account({self.owner!r}, {self._balance!r})"  # REPL, lists
```

## The four pillars

| Pillar | Python |
|---|---|
| Encapsulation | `_name` convention, `@property` with a setter for validation |
| Abstraction | `from abc import ABC, abstractmethod`; abstract class cannot be instantiated |
| Inheritance | `class Manager(Employee):` + `super().__init__(...)` |
| Polymorphism | same method name, different behaviour per subclass; caller does not check types |

```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self): ...
```

`Shape()` → `TypeError`. A subclass missing an abstract method also raises `TypeError` when created.

## JSON persistence (Mini Project 1)

```python
json.dump([x.to_dict() for x in items], f, indent=2)     # save on every change
try:
    data = json.load(f)                                  # load at start
except FileNotFoundError:
    data = []                                            # first run
except json.JSONDecodeError:
    data = []                                            # corrupted: warn, start fresh
```

Modules: `models.py` · `storage.py` · `cli.py` · `main.py`. Every feature = Issue → branch → PR (`Closes #n`).

## Array patterns

| Pattern | Carry | Problem |
|---|---|---|
| Running minimum | cheapest price so far | Best Time to Buy and Sell Stock (121) |
| Write index | next slot for a kept value | Move Zeroes (283) |
| Reversal | two indexes moving inward | Rotate Array (189): reverse all, first k, rest |
| Kadane | best sum ending here: `max(x, cur + x)` | Maximum Subarray (53) |
| Sum formula / XOR | expected minus actual | Missing Number (268) |

Insert or delete at the front of a list is O(n); `a.remove(x)` in a loop is O(n²).

## This week

| Item | Details |
|---|---|
| **Deliverable** | Mini Project 1 repository with README (setup, usage, screenshots) and an issue board |
| **Practice quiz** | Object-Oriented Python & Phase 1 Mini Project (untimed, retakes allowed) |
| **Phase 1 test** | 30 questions covering Weeks 1–4: terminal, Git, Python, collections, files, OOP, Big-O, arrays and hashing, 45 minutes |
| **DSA** | Best Time to Buy and Sell Stock (LC 121), Rotate Array (LC 189), Move Zeroes (LC 283), Maximum Subarray (LC 53), Missing Number (LC 268) |
| **Career task** | GitHub profile README with photo, short bio, skills and pinned repositories |
