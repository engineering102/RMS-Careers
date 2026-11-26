---
type: notes
title: "W4 · S1 · Classes and Objects"
slug: w04-s1-classes-and-objects
topic: Object-Oriented Python
subject: programming-fundamentals
minutes: 35
description: Classes and objects, __init__ and self, instance versus class attributes, methods, and __str__ versus __repr__, built up through a BankAccount and a Student class.
---
# Classes and objects

So far your data has lived in separate variables, lists and dicts, with functions operating on them from outside.
**Object-oriented programming** (OOP) bundles data and the functions that work on it into one unit, an **object**.
Every mini project and most real codebases you will meet are organised this way.

## Class versus object

A **class** is a blueprint; an **object** (or **instance**) is one thing built from it.

| Class | Objects |
|---|---|
| `Student` | Asha (roll 101), Ravi (roll 102) |
| `BankAccount` | account 5001 with ₹2,000, account 5002 with ₹0 |

You have used objects all along: `"hello"` is an object of class `str`, and `"hello".upper()` calls one of its methods.

## Your first class

```python
class Student:
    def __init__(self, name, roll_no):
        self.name = name          # instance attributes
        self.roll_no = roll_no
        self.marks = []

    def add_mark(self, mark):
        self.marks.append(mark)

    def average(self):
        if not self.marks:
            return 0.0
        return sum(self.marks) / len(self.marks)


asha = Student("Asha", 101)       # creates an object; __init__ runs
asha.add_mark(88)
asha.add_mark(76)
print(asha.name, asha.average())  # Asha 82.0
```

- `class Student:` defines the class. Class names use **PascalCase**.
- `__init__` is the **initialiser**. Python calls it automatically when you write `Student(...)`, to set up the new
  object's attributes.
- `self` is the object the method is working on. `asha.add_mark(88)` is really `Student.add_mark(asha, 88)`; Python
  passes `asha` as `self` for you. You must write `self` as the first parameter of every regular method, but you never
  pass it yourself.
- **Attributes** are the object's data (`self.name`); **methods** are functions defined in the class that use it.

A common bug is forgetting `self.`: writing `marks = []` inside `__init__` creates a local variable that vanishes when
`__init__` returns, and later `self.marks` raises `AttributeError`.

## Instance attributes versus class attributes

**Instance attributes** belong to one object (set via `self.x = ...`). **Class attributes** are defined in the class
body and shared by all instances.

```python
class Student:
    programme = "Placement Prep"           # class attribute: shared
    count = 0

    def __init__(self, name):
        self.name = name                      # instance attribute: per object
        Student.count += 1

a = Student("Asha")
b = Student("Ravi")
print(a.programme, b.programme)  # same value for both
print(Student.count)           # 2
```

When you read `a.programme`, Python looks on the object first, then on the class. A trap: **assigning** through an
instance creates a new instance attribute that hides the class one, rather than changing the shared value:

```python
a.programme = "Data Track"
print(a.programme)      # Data Track  (instance attribute on a only)
print(b.programme)      # Placement Prep  (unchanged)
```

To change the shared value, assign through the class: `Student.programme = "..."`. Also, never use a mutable class
attribute such as `marks = []` for per-object data: every object would share the same list.

## Methods that protect the object's rules

Methods are where you enforce rules, so the object can never get into an invalid state.

```python
class InsufficientFundsError(Exception):
    pass


class BankAccount:
    interest_rate = 0.04                       # 4% a year, shared by all accounts

    def __init__(self, account_no, holder, balance=0):
        if balance < 0:
            raise ValueError("opening balance cannot be negative")
        self.account_no = account_no
        self.holder = holder
        self.balance = balance
        self.history = []

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("deposit must be positive")
        self.balance += amount
        self.history.append(("deposit", amount))

    def withdraw(self, amount):
        if amount <= 0:
            raise ValueError("withdrawal must be positive")
        if amount > self.balance:
            raise InsufficientFundsError(f"balance is only {self.balance}")
        self.balance -= amount
        self.history.append(("withdraw", amount))

    def add_yearly_interest(self):
        interest = round(self.balance * BankAccount.interest_rate, 2)
        self.deposit(interest)
        return interest

    def __str__(self):
        return f"Account {self.account_no} ({self.holder}): ₹{self.balance:,.2f}"

    def __repr__(self):
        return f"BankAccount({self.account_no!r}, {self.holder!r}, {self.balance!r})"


acc = BankAccount(5001, "Asha", 2000)
acc.deposit(500)
try:
    acc.withdraw(5000)
except InsufficientFundsError as e:
    print("Refused:", e)          # Refused: balance is only 2500
print(acc)                        # Account 5001 (Asha): ₹2,500.00
```

Methods can call other methods on the same object through `self` (`add_yearly_interest` reuses `deposit`), so the
rules live in one place.

## __str__ and __repr__

These are **special methods** (also called dunder methods, for the double underscores). Python calls them for you.

| Method | Called by | Audience | Aim |
|---|---|---|---|
| `__str__` | `print(obj)`, `str(obj)`, f-strings | end users | readable |
| `__repr__` | the REPL, `repr(obj)`, printing a list of objects | developers | unambiguous; ideally looks like code that recreates the object |

```python
accounts = [BankAccount(1, "Ravi"), BankAccount(2, "Meena", 100)]
print(accounts)
# [BankAccount(1, 'Ravi', 0), BankAccount(2, 'Meena', 100)]
```

Printing a list uses `__repr__` for each item. If you define only `__repr__`, `print(obj)` falls back to it. Without
either, you get something unhelpful like `<__main__.BankAccount object at 0x...>`. Define at least `__repr__` on
every class you write; it makes debugging far easier.

## Objects are references

Like lists, objects are passed by reference: assigning `b = a` gives a second name for the **same** object.

```python
a = BankAccount(7, "Kiran", 100)
b = a
b.deposit(50)
print(a.balance)    # 150
```

## Lab: BankAccount and Student

1. Type in the `BankAccount` class and extend it with `transfer(self, other, amount)`, which withdraws from this
   account and deposits into `other`. If the withdrawal fails, `other` must not change.
2. Add a `statement()` method that prints the transaction history in a neat table.
3. Write a `Student` class with `name`, `roll_no` and a `marks` dict (subject → marks). Methods: `add_mark(subject,
   marks)` that rejects values outside 0–100, `total()`, `average()`, `grade()` (A/B/C/F with your own bands), and
   `__str__`/`__repr__`.
4. Create five students, store them in a list, and print them sorted by average:
   `sorted(students, key=lambda s: s.average(), reverse=True)`.

## Check yourself

1. In `acc.deposit(500)`, what is `self` and who passes it?
2. A class has `count = 0` at class level. Is it shared by every object or copied into each?
3. Which special method does `print([obj1, obj2])` use for each item?
