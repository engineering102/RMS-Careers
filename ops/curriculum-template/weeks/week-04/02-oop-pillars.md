---
type: notes
title: "W4 · S2 · Inheritance, Polymorphism, Encapsulation and Abstraction"
slug: w04-s2-oop-pillars
topic: Object-Oriented Python
subject: programming-fundamentals
minutes: 40
description: The four OOP pillars in Python: inheritance and super(), method overriding, polymorphism, encapsulation with naming conventions and @property, and abstraction with the abc module, through Shape and Employee/Manager exercises.
---
# The four pillars: inheritance, polymorphism, encapsulation, abstraction

Classes on their own group data and behaviour. The four "pillars" of OOP are the ideas that make large programs
manageable: reuse what is shared, hide what is internal, and let different objects respond to the same request in
their own way. Interviewers ask about these often, usually with "give an example from your project".

## 1. Inheritance

A **subclass** (child) inherits the attributes and methods of a **base class** (parent) and can add or change
behaviour. Use it for a genuine **"is-a"** relationship: a Manager *is an* Employee.

```python
class Employee:
    def __init__(self, name, salary):
        self.name = name
        self.salary = salary

    def annual_pay(self):
        return self.salary * 12

    def describe(self):
        return f"{self.name} earns ₹{self.annual_pay():,} a year"


class Manager(Employee):                     # Manager inherits from Employee
    def __init__(self, name, salary, team_size):
        super().__init__(name, salary)       # let the parent set name and salary
        self.team_size = team_size

    def annual_pay(self):                    # override
        base = super().annual_pay()
        return base + 10_000 * self.team_size


e = Employee("Asha", 50_000)
m = Manager("Ravi", 80_000, 4)
print(e.describe())   # Asha earns ₹600,000 a year
print(m.describe())   # Ravi earns ₹1,000,000 a year
```

- `class Manager(Employee)` declares the parent.
- `super().__init__(...)` runs the parent's initialiser, so you do not repeat its code. Forgetting it means
  `self.name` is never set.
- `Manager` did not define `describe`, so it uses `Employee.describe`. Inside it, `self.annual_pay()` calls the
  **Manager** version, because `self` is a Manager.
- `isinstance(m, Employee)` is `True`; `issubclass(Manager, Employee)` is `True`.

(The `:,` format inserts commas every three digits, international style. Indian lakh grouping such as 10,00,000 needs
custom formatting.)

When **not** to inherit: if the relationship is "has-a" (a Library *has* Books), store the other object as an attribute
instead. This is called **composition**, and it is usually the better default.

## 2. Method overriding and polymorphism

**Overriding** means a subclass provides its own version of a method that the parent also has. **Polymorphism** ("many
forms") means code can call the same method on different types of object and each responds in its own way, without the
caller checking the type.

```python
import math

class Shape:
    def area(self):
        raise NotImplementedError

    def describe(self):
        return f"{type(self).__name__} with area {self.area():.2f}"


class Circle(Shape):
    def __init__(self, r):
        self.r = r

    def area(self):
        return math.pi * self.r ** 2


class Rectangle(Shape):
    def __init__(self, w, h):
        self.w, self.h = w, h

    def area(self):
        return self.w * self.h


class Square(Rectangle):
    def __init__(self, side):
        super().__init__(side, side)


shapes = [Circle(1), Rectangle(2, 3), Square(4)]
for s in shapes:
    print(s.describe())
# Circle with area 3.14
# Rectangle with area 6.00
# Square with area 16.00

print(sum(s.area() for s in shapes))   # works for any mix of shapes
```

The loop never asks "is this a Circle?". Adding a `Triangle` later needs no change to that loop: that is the practical
value of polymorphism. Python also applies it to built-ins: `len()` works on strings, lists and dicts because each
defines `__len__`. This is often described as **duck typing**: if an object has the method you call, it works.

## 3. Encapsulation

Encapsulation means **keeping an object's internal data behind its methods**, so outside code cannot put it into an
invalid state. Python does not enforce private attributes; it relies on naming conventions.

| Name | Meaning |
|---|---|
| `balance` | public: part of the interface |
| `_balance` | "internal, please do not touch from outside" (a convention only) |
| `__balance` | name-mangled to `_ClassName__balance`, to avoid clashes in subclasses; still reachable, rarely needed |

### Properties

A **property** lets you expose an attribute that looks simple from outside (`acc.balance`) while running code behind
it, such as validation.

```python
class Product:
    def __init__(self, name, price):
        self.name = name
        self.price = price            # goes through the setter below

    @property
    def price(self):
        return self._price

    @price.setter
    def price(self, value):
        if value < 0:
            raise ValueError("price cannot be negative")
        self._price = value

    @property
    def price_with_gst(self):         # read-only, computed property
        return round(self._price * 1.18, 2)


p = Product("Notebook", 50)
print(p.price, p.price_with_gst)      # 50 59.0
p.price = 60                          # setter runs and validates
p.price = -5                          # ValueError
p.price_with_gst = 100                # AttributeError: no setter, so read-only
```

(The 18% rate is just an example value for the exercise.)

Start with plain public attributes. Switch to a property when you need validation or a computed value; callers do not
need to change, because the syntax stays `p.price`.

## 4. Abstraction with abc

**Abstraction** means exposing *what* an object does and hiding *how*. An **abstract base class** (ABC) defines methods
every subclass **must** implement, and cannot itself be instantiated.

```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self):
        """Return the area of the shape."""

    @abstractmethod
    def perimeter(self):
        """Return the perimeter of the shape."""

    def describe(self):                       # concrete method shared by all
        return f"area={self.area():.2f}, perimeter={self.perimeter():.2f}"


class Rectangle(Shape):
    def __init__(self, w, h):
        self.w, self.h = w, h

    def area(self):
        return self.w * self.h

    def perimeter(self):
        return 2 * (self.w + self.h)


class Circle(Shape):
    def __init__(self, r):
        self.r = r

    def area(self):
        return 3.14159 * self.r ** 2
    # perimeter() is missing


print(Rectangle(2, 3).describe())   # area=6.00, perimeter=10.00
Shape()                             # TypeError: can't instantiate abstract class
Circle(1)                           # TypeError: perimeter is not implemented
```

The error comes **when you create the object**, not later when a missing method is called. This is stronger than the
`raise NotImplementedError` approach in the previous section, and it is what your Mini Project 1 requires (one abstract
base class with two subclasses that override a method).

## The four pillars at a glance

| Pillar | One-line meaning | Python tool |
|---|---|---|
| Encapsulation | protect internal state behind methods | `_name` convention, `@property` |
| Abstraction | define *what*, hide *how* | `abc.ABC`, `@abstractmethod` |
| Inheritance | reuse a parent's code in an is-a relationship | `class Child(Parent)`, `super()` |
| Polymorphism | same call, different behaviour per type | overriding, duck typing |

## Lab: shapes and employees

1. **Shape hierarchy.** Build the abstract `Shape` with `area` and `perimeter`; implement `Rectangle`, `Square`
   (inherits from `Rectangle`), `Circle` and `Triangle` (three sides; use Heron's formula and raise `ValueError` if the
   sides cannot form a triangle). Sort a mixed list by area and print each with `describe()`.
2. **Employee / Manager.** Make `Employee` abstract with an abstract `annual_pay()`. Implement `FullTimeEmployee`
   (monthly salary), `Intern` (stipend for a fixed number of months) and `Manager` (a full-timer with a bonus per team
   member). Give `Employee` a `salary` property that rejects negative values. Write `payroll_total(staff)` that works for
   any mix.
3. For each class, write `__repr__`.

## Check yourself

1. What happens if a subclass's `__init__` does not call `super().__init__(...)`?
2. Why does `Shape()` fail when `Shape` inherits from `ABC` and has an abstract method?
3. What is the difference between `_balance` and a `balance` property?
