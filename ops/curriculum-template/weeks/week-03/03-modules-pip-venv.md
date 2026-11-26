---
type: notes
title: "W3 · S3 · Modules, Packages, pip and Virtual Environments"
slug: w03-s3-modules-pip-venv
topic: Modules & Environments
subject: dev-tools
minutes: 35
description: Importing modules, building a package, a tour of os, datetime, random and math, installing with pip, isolating projects with venv, and recreating an environment from requirements.txt.
---
# Modules, packages, pip and virtual environments

Real projects are split across many files and reuse code written by other people. This session covers how Python
finds and loads that code, and how to keep each project's third-party libraries separate.

## Modules

A **module** is simply a `.py` file. Last week you wrote `number_utils.py`; any other file in the same folder can use it:

```python
# menu.py
import number_utils

print(number_utils.gcd(12, 18))
```

| Import form | Use as | Notes |
|---|---|---|
| `import math` | `math.sqrt(16)` | clear where each name comes from |
| `import datetime as dt` | `dt.date.today()` | alias for long names |
| `from math import sqrt, pi` | `sqrt(16)` | imports just those names |
| `from math import *` | `sqrt(16)` | avoid: you cannot tell where names came from |

When a module is imported, Python runs its top-level code **once**. That is why tests belong under
`if __name__ == "__main__":`. When you run a file directly, its `__name__` is `"__main__"`; when it is imported,
`__name__` is the module's name, so the test block is skipped.

### Where Python looks

Python searches, in order, the folder of the script you ran, then the standard library, then installed packages.
A consequence: **never name your file after a module you import**. A file called `random.py` or `csv.py` in your
folder hides the real one, and `import random` loads your file instead.

## Packages

A **package** is a folder of modules. Adding an `__init__.py` file (it can be empty) marks it as a regular package.

```text
week-03/
├── main.py
└── rmsutils/
    ├── __init__.py
    ├── numbers.py      # gcd, is_prime, ...
    └── text.py         # count_vowels, to_title, ...
```

```python
# main.py
from rmsutils.numbers import gcd
from rmsutils import text

print(gcd(8, 12), text.count_vowels("Engineering"))
```

Run `python main.py` from the `week-03` folder so Python can find `rmsutils`.

## A tour of the standard library

Python ships with a large standard library: no installation needed.

**os**: the operating system and file system.

```python
import os

print(os.getcwd())                     # current working directory
print(os.listdir("."))                 # files and folders here
os.makedirs("reports", exist_ok=True)  # create a folder (no error if it exists)
print(os.path.exists("marks.csv"))     # True / False
print(os.environ.get("HOME"))          # an environment variable, or None
```

(`pathlib` is the modern, object-oriented alternative for paths, and you will see both.)

**datetime**: dates and times.

```python
from datetime import date, datetime, timedelta

today = date.today()
due = today + timedelta(days=14)
print(due.strftime("%d-%m-%Y"))          # e.g. 10-12-2026
print((due - today).days)                # 14
parsed = datetime.strptime("2026-08-15", "%Y-%m-%d")
print(parsed.year)                       # 2026
```

**random**: pseudo-random numbers (fine for games and test data; use the `secrets` module for anything security-related).

```python
import random

print(random.randint(1, 6))              # 1 to 6, both included
print(random.choice(["red", "green"]))
items = [1, 2, 3, 4]
random.shuffle(items)                    # shuffles in place
random.seed(42)                          # same sequence every run: useful for tests
```

**math**: maths functions.

```python
import math

print(math.sqrt(49), math.pi, math.factorial(5))   # 7.0 3.141592653589793 120
print(math.ceil(4.1), math.floor(4.9))             # 5 4
print(math.gcd(12, 18), math.isqrt(50))            # 6 7
```

## pip: installing third-party packages

`pip` downloads packages from the Python Package Index (PyPI).

```bash
python -m pip install requests          # install
python -m pip install requests==2.32.3  # a specific version
python -m pip list                      # what is installed
python -m pip uninstall requests
```

Using `python -m pip` guarantees you install into the same Python that `python` runs. Only install packages you
trust and whose names you have checked carefully: a misspelt name can install a different package.

## Virtual environments (venv)

If every project installs packages into the same global Python, one project's upgrade can break another. A **virtual
environment** is a private copy of the Python setup for one project.

```bash
# create (once per project), in the project folder
python -m venv .venv

# activate (every new terminal)
.venv\Scripts\Activate.ps1       # Windows PowerShell
source .venv/bin/activate        # macOS / Linux

# your prompt now starts with (.venv); installs go into .venv only
python -m pip install requests

deactivate                       # leave the environment
```

On Windows with Git Bash, the activate script is `source .venv/Scripts/activate`. If PowerShell refuses to run the
activate script, your tutor will show you how to allow local scripts for your user account.

VS Code: press **Ctrl+Shift+P → Python: Select Interpreter** and choose the `.venv` interpreter so the editor and
debugger use it.

Add `.venv/` to `.gitignore`. Never commit a virtual environment; commit the **list** of packages instead.

## requirements.txt

```bash
python -m pip freeze > requirements.txt     # record exact installed versions
```

```text
certifi==...
charset-normalizer==...
idna==...
requests==2.32.3
urllib3==...
```

(Each line is `package==exact.version`; your versions depend on when you install.)

Anyone (including you, on a new laptop) can rebuild the same environment:

```bash
python -m venv .venv
.venv\Scripts\Activate.ps1                 # or: source .venv/bin/activate
python -m pip install -r requirements.txt
```

`pip freeze` lists every installed package, including dependencies you did not install directly. That is fine for a
student project. If your project uses only the standard library, `requirements.txt` can be empty; it still documents
that fact.

## Lab: package your utilities and rebuild an environment

1. Create `week-03/rmsutils/` with `__init__.py`, `numbers.py` (your Week 2 number functions) and `text.py` (your
   string utilities). Write `week-03/main.py` that imports from both and prints a few results.
2. Create a venv in `week-03`, activate it, install one small package (for example `requests`), and run
   `python -m pip freeze > requirements.txt`.
3. Check that `.venv/` is ignored by Git, then commit the code and `requirements.txt`.
4. Prove it is reproducible: delete `.venv`, recreate it, run `pip install -r requirements.txt`, and run `main.py`.
5. Use `datetime` to print how many days remain until the end of this semester.

## Check yourself

1. Why should you not name your own file `random.py`?
2. What is the purpose of `requirements.txt`, and why is it committed while `.venv/` is not?
3. What does `if __name__ == "__main__":` protect against when a module is imported?
