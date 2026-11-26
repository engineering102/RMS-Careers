---
type: notes
title: "W3 · S2 · Files and Exceptions"
slug: w03-s2-files-and-exceptions
topic: Files & Exceptions
subject: programming-fundamentals
minutes: 40
description: Reading and writing text, CSV and JSON files with context managers, try/except/else/finally, raising and defining custom exceptions, and a student-marks CSV to summary JSON converter.
---
# Files and exceptions

Until now, everything your programs knew disappeared when they ended. Files let data **persist**. Files also go wrong
in ways your code cannot control (a missing file, a corrupted row), so this session pairs file handling with
**exceptions**, Python's way of handling errors without crashing.

## Opening files with a context manager

```python
with open("notes.txt", "w", encoding="utf-8") as f:
    f.write("First line\n")
    f.write("Second line\n")

with open("notes.txt", "r", encoding="utf-8") as f:
    for line in f:
        print(line.strip())
```

The `with` block is a **context manager**: it closes the file automatically when the block ends, even if an error
happens inside it. Always use `with` for files.

| Mode | Meaning | If the file exists | If it does not exist |
|---|---|---|---|
| `"r"` | read (default) | reads it | `FileNotFoundError` |
| `"w"` | write | **erases it first** | creates it |
| `"a"` | append | adds to the end | creates it |
| `"x"` | exclusive create | `FileExistsError` | creates it |

Pass `encoding="utf-8"` explicitly. Windows may otherwise use a different default encoding, and names with non-ASCII
characters can break.

| Reading method | Returns |
|---|---|
| `f.read()` | the whole file as one string |
| `f.readline()` | the next line (including `\n`) |
| `f.readlines()` | a list of all lines |
| `for line in f:` | one line at a time (memory-friendly for large files) |

Paths: use forward slashes or `pathlib.Path` so code works on Windows, macOS and Linux:
`Path("data") / "marks.csv"`.

## CSV files

CSV (comma-separated values) is the format spreadsheets export. Use the `csv` module rather than `split(",")`, because
real CSV fields can contain quoted commas.

```python
import csv

with open("marks.csv", newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)          # uses the header row as keys
    for row in reader:
        print(row["name"], int(row["marks"]))
```

Every value from a CSV reader is a **string**: convert numbers yourself. Writing:

```python
rows = [{"name": "Asha", "marks": 86}, {"name": "Ravi", "marks": 74}]
with open("out.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["name", "marks"])
    writer.writeheader()
    writer.writerows(rows)
```

`newline=""` is what the `csv` documentation asks for; without it you can get blank lines between rows on Windows.

## JSON files

JSON is the text format used by web APIs and config files. It maps closely onto Python types.

| JSON | Python |
|---|---|
| object `{}` | `dict` |
| array `[]` | `list` |
| string | `str` |
| number | `int` / `float` |
| `true` / `false` | `True` / `False` |
| `null` | `None` |

```python
import json

data = {"batch": "CSE-A", "students": [{"name": "Asha", "total": 432}]}

with open("summary.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)        # file

with open("summary.json", encoding="utf-8") as f:
    loaded = json.load(f)

text = json.dumps(data)                 # to a string (s = string)
back = json.loads(text)                 # from a string
```

JSON keys are always strings: a dict with integer keys comes back with string keys after a round trip.

## Exceptions

When something goes wrong, Python **raises an exception**. If nothing handles it, the program stops with a traceback.
`try`/`except` lets you handle it.

```python
try:
    n = int(input("Number: "))
    print(100 / n)
except ValueError:
    print("That was not a whole number")
except ZeroDivisionError:
    print("Cannot divide by zero")
```

The full form has four parts:

```python
try:
    f = open("marks.csv", encoding="utf-8")
except FileNotFoundError:
    print("marks.csv is missing")
else:
    print("Lines:", len(f.readlines()))   # runs only if try succeeded
    f.close()
finally:
    print("Done")                         # always runs
```

| Block | Runs when |
|---|---|
| `try` | always, first |
| `except X` | an exception of type `X` (or a subclass) was raised in `try` |
| `else` | `try` finished **without** an exception |
| `finally` | always, last, even after `return` or an unhandled error |

Exceptions you will meet often: `ValueError`, `TypeError`, `KeyError`, `IndexError`, `ZeroDivisionError`,
`FileNotFoundError`, `json.JSONDecodeError`.

Good practice:

- Catch **specific** exceptions. A bare `except:` also hides typos and Ctrl+C.
- Keep the `try` block **small**, around just the lines that can fail.
- Use `except ValueError as e:` to read the message: `print(e)`.

## Raising exceptions and custom exceptions

You can raise an exception yourself when input breaks your rules:

```python
def set_marks(marks):
    if not 0 <= marks <= 100:
        raise ValueError(f"marks must be 0-100, got {marks}")
    return marks
```

For errors specific to your program, define a **custom exception** by subclassing `Exception`:

```python
class InvalidRowError(Exception):
    """Raised when a CSV row cannot be used."""

def parse_row(row):
    if not row.get("name"):
        raise InvalidRowError("missing name")
    try:
        marks = int(row["marks"])
    except (KeyError, ValueError):
        raise InvalidRowError(f"bad marks: {row.get('marks')!r}")
    if not 0 <= marks <= 100:
        raise InvalidRowError(f"marks out of range: {marks}")
    return row["name"], marks
```

Callers can now catch exactly this kind of problem with `except InvalidRowError`.

## Lab: student-marks CSV → summary JSON

Input `marks.csv`:

```text
roll_no,name,subject,marks
101,Asha,Maths,88
101,Asha,Physics,76
102,Ravi,Maths,abc
102,Ravi,Physics,64
103,,Maths,70
```

```python
import csv
import json

class InvalidRowError(Exception):
    pass

def parse_row(row):
    name = (row.get("name") or "").strip()
    if not name:
        raise InvalidRowError("missing name")
    try:
        marks = int(row["marks"])
    except (KeyError, TypeError, ValueError):
        raise InvalidRowError(f"marks not a number: {row.get('marks')!r}")
    if not 0 <= marks <= 100:
        raise InvalidRowError(f"marks out of range: {marks}")
    return name, row["subject"], marks

def summarise(path):
    totals, errors = {}, []
    with open(path, newline="", encoding="utf-8") as f:
        for line_no, row in enumerate(csv.DictReader(f), start=2):
            try:
                name, subject, marks = parse_row(row)
            except InvalidRowError as e:
                errors.append(f"line {line_no}: {e}")
                continue
            totals.setdefault(name, []).append(marks)
    summary = {
        name: {"total": sum(m), "average": round(sum(m) / len(m), 2)}
        for name, m in totals.items()
    }
    return summary, errors

if __name__ == "__main__":
    try:
        summary, errors = summarise("marks.csv")
    except FileNotFoundError:
        print("marks.csv not found")
    else:
        with open("summary.json", "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)
        print(f"Wrote {len(summary)} students; {len(errors)} bad rows")
        for e in errors:
            print(" ", e)
```

With the sample file this writes Asha (total 164, average 82.0) and Ravi (total 64, average 64.0) and reports two bad
rows (line 4 and line 6). Extend it toward your Weekly Build: per-subject averages, grades, and an `errors.txt` file.

## Check yourself

1. Why is `with open(...) as f:` preferred to calling `open` and `close` yourself?
2. In `try/except/else/finally`, which block runs only when no exception occurred?
3. You open an existing `results.txt` with mode `"w"`. What happens to its contents?
