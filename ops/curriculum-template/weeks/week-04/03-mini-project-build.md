---
type: notes
title: "W4 · S3 · Mini Project 1 Build: OOP App with JSON Persistence"
slug: w04-s3-mini-project-build
topic: Mini Project 1
subject: programming-fundamentals
minutes: 40
description: How to build Mini Project 1 in pairs: module layout, model classes with to_dict/from_dict, safe JSON persistence, a validated menu CLI, and planning the work as GitHub Issues on a Projects board.
---
# Mini Project 1 build: an OOP app with JSON persistence

This session turns four weeks of skills into one small product. In pairs, you build an object-oriented command-line
app that saves its data to JSON. Choose **one**:

| Option | Core features |
|---|---|
| **Library Manager** | books and members, issue/return with due dates, overdue fine, search by title or author |
| **Expense Tracker** | income and expenses by category, monthly summary, budget per category with an over-budget warning, CSV export |
| **Hostel Mess Planner** | weekly menu, student meal opt-in/opt-out, headcount per meal, cost per student per month |

The full requirements and rubric are in the **MP1 · Python OOP Command-Line App** project item. This note shows how to
structure the work so that it actually gets finished.

## Step 1: plan with GitHub Issues and a Projects board

Before writing code, break the app into features. Each feature becomes a **GitHub Issue**.

1. One partner creates the repository (with a README and a Python `.gitignore`) and adds the other as a collaborator
   (**Settings → Collaborators**).
2. Open **Issues → New issue** for every feature. Aim for 8 or more, each small enough to finish in one sitting:
   - "Add Book and Member model classes"
   - "Save and load library data as JSON"
   - "Issue a book to a member with a due date"
   - "Calculate overdue fine on return"
   - "Search books by title or author"
   - "Main menu with input validation"
   - "Handle missing or corrupted data file"
   - "README with setup, usage and screenshots"
3. Create a board: **Projects → New project → Board**. Link it to the repository and add the issues. Use the
   columns **Todo**, **In Progress** and **Done**.
4. Assign each issue to one partner. Split features so that **both of you own models and menu code**; the rubric
   expects both to commit and both to explain any line.

Work each issue on its own branch and close it from the PR description with `Closes #<issue number>`.

## Step 2: lay out the modules

```text
library-manager/
├── main.py          # entry point: load data, run the menu
├── models.py        # classes: the domain (Book, Member, Loan, ...)
├── storage.py       # JSON save/load, nothing else
├── cli.py           # menu, input prompts and printing
├── data/            # library.json is written here (gitignored, or commit a sample)
├── README.md
└── .gitignore
```

Keeping `print` and `input` out of `models.py` makes the models easy to test and reuse; keeping file code in
`storage.py` means you could later swap JSON for a database without touching the rest.

## Step 3: model classes that can become JSON

`json` only understands dicts, lists, strings, numbers, booleans and `None`. Give each model a `to_dict()` method
and a `from_dict()` **class method** that rebuilds the object. Dates are stored as ISO strings (`"2026-12-01"`).

```python
# models.py
from abc import ABC, abstractmethod
from datetime import date


class LibraryError(Exception):
    """Base class for errors the user can fix."""


class Item(ABC):
    def __init__(self, item_id, title):
        self.item_id = item_id
        self.title = title

    @abstractmethod
    def loan_days(self):
        """How many days this item may be borrowed for."""

    @abstractmethod
    def to_dict(self):
        """Return a JSON-safe dict."""


class Book(Item):
    def __init__(self, item_id, title, author):
        super().__init__(item_id, title)
        self.author = author

    def loan_days(self):
        return 14

    def to_dict(self):
        return {"kind": "book", "item_id": self.item_id, "title": self.title, "author": self.author}

    @classmethod
    def from_dict(cls, d):
        return cls(d["item_id"], d["title"], d["author"])


class Magazine(Item):
    def loan_days(self):
        return 7

    def to_dict(self):
        return {"kind": "magazine", "item_id": self.item_id, "title": self.title}

    @classmethod
    def from_dict(cls, d):
        return cls(d["item_id"], d["title"])


class Loan:
    FINE_PER_DAY = 2

    def __init__(self, item_id, member_id, due):
        self.item_id = item_id
        self.member_id = member_id
        self.due = due                      # a datetime.date

    @property
    def is_overdue(self):
        return date.today() > self.due

    def fine(self, returned_on):
        late_days = (returned_on - self.due).days
        return max(0, late_days) * Loan.FINE_PER_DAY

    def to_dict(self):
        return {"item_id": self.item_id, "member_id": self.member_id, "due": self.due.isoformat()}

    @classmethod
    def from_dict(cls, d):
        return cls(d["item_id"], d["member_id"], date.fromisoformat(d["due"]))
```

A `@classmethod` receives the class (`cls`) instead of an instance, so `Book.from_dict(d)` builds and returns a new
`Book`. The `"kind"` field tells the loader which class to use. (The fine of ₹2 a day is an example value: pick your
own rules and state them in the README.)

## Step 4: storage that never crashes

The requirement: data is **saved on every change** and **loaded at start**, and a **missing or corrupted file must not
crash the app**.

```python
# storage.py
import json
import os

from models import Book, Loan, Magazine

KINDS = {"book": Book, "magazine": Magazine}


def save(path, items, loans):
    data = {
        "items": [i.to_dict() for i in items.values()],
        "loans": [l.to_dict() for l in loans],
    }
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, path)          # swap in the new file in one step


def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        items = {}
        for d in data["items"]:
            item = KINDS[d["kind"]].from_dict(d)
            items[item.item_id] = item
        loans = [Loan.from_dict(d) for d in data["loans"]]
        return items, loans, None
    except FileNotFoundError:
        return {}, [], None                        # first run: start empty
    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as e:
        return {}, [], f"Data file unreadable ({e}); starting fresh."
```

Writing to a temporary file and then calling `os.replace` means a crash in the middle of saving leaves the old file
intact instead of half-written. `load` returns a warning message instead of printing it, so `storage.py` stays free of
user-interface code. Consider renaming the damaged file to `library.json.bak` before starting fresh, so data is not
silently lost.

## Step 5: a menu that validates input

```python
# cli.py
def ask_int(prompt, low=None, high=None):
    while True:
        raw = input(prompt).strip()
        try:
            value = int(raw)
        except ValueError:
            print("Please enter a whole number.")
            continue
        if (low is not None and value < low) or (high is not None and value > high):
            print(f"Please enter a number between {low} and {high}.")
            continue
        return value


def ask_text(prompt):
    while True:
        text = input(prompt).strip()
        if text:
            return text
        print("This field cannot be empty.")
```

Business rules (a book already issued, an unknown member) belong in the models or a service class and are reported by
raising your custom exception. The menu catches it and prints the message:

```python
try:
    library.issue(item_id, member_id)
    storage.save(DATA_FILE, library.items, library.loans)
    print("Issued.")
except LibraryError as e:
    print("Cannot issue:", e)
```

## Step 6: README and evidence

Your README must cover: what the app does, the chosen option, how to run it (Python version, `python main.py`), a
feature list, the class design (a short list of classes and what each is for), terminal **screenshots** of the main
flows, and who built which features. The Git history should show both partners committing through branches and PRs.

## Lab: build in pairs

- [ ] Repository created, partner added, 8+ issues on a Projects board, each assigned
- [ ] `models.py` with at least 4 classes, one abstract base class with two subclasses overriding a method, one
  `@property`
- [ ] `storage.py` saves on every change and survives a missing or corrupted file (test both: delete the file; type
  rubbish into it)
- [ ] `cli.py` menu with validated input and at least one custom exception handled
- [ ] Every feature merged through a PR that closes its issue
- [ ] README with screenshots

## Check yourself

1. Why do the model classes need `to_dict()` and `from_dict()` before you can save them as JSON?
2. What should happen when the data file contains invalid JSON, and which exception tells you so?
3. Why is it useful to keep `input()` and `print()` out of `models.py`?
