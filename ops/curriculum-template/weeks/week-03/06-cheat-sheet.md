---
type: resource
title: "W3 · Cheat Sheet: Collections, Files, Modules, Git Branches and Big-O"
slug: w03-cheat-sheet
topic: Week 3 Reference
subject: programming-fundamentals
minutes: 10
description: One-page reference for Week 3 — dict and set operations, files and exceptions, venv and pip, branching and pull requests, Big-O costs, this week's deliverable and career task.
---
# Week 3 cheat sheet

## Choosing a collection

| Need | Use |
|---|---|
| ordered sequence that changes | `list` |
| fixed record, or a multi-part dict key | `tuple` |
| uniqueness, fast "seen before?" | `set` |
| look up by key, count, group | `dict` |

## Dicts and sets

```python
d.get(k, default)            # no KeyError
for k, v in d.items(): ...   # keys and values
freq[x] = freq.get(x, 0) + 1                 # counting
groups.setdefault(key, []).append(item)      # grouping
{k: v for k, v in pairs if v > 0}            # dict comprehension
empty_set = set()                            # {} is an empty dict
a | b   a & b   a - b   a ^ b                # union, intersection, difference, symmetric
s.discard(x)                                 # no error if missing (remove raises KeyError)
```

## Files and exceptions

```python
with open("f.txt", "r", encoding="utf-8") as f:     # "w" erases, "a" appends
    for line in f: ...

csv.DictReader(f) / csv.DictWriter(f, fieldnames=[...])   # open with newline=""
json.dump(obj, f, indent=2) / json.load(f)                # dumps / loads for strings

try:
    ...
except (ValueError, KeyError) as e:   # catch specific exceptions
    ...
else:                                 # no exception
    ...
finally:                              # always
    ...

class InvalidRowError(Exception): pass
raise InvalidRowError("reason")
```

## Modules and environments

| Task | Command |
|---|---|
| create venv | `python -m venv .venv` |
| activate | `.venv\Scripts\Activate.ps1` (PowerShell) · `source .venv/bin/activate` (macOS/Linux) |
| install | `python -m pip install <package>` |
| record | `python -m pip freeze > requirements.txt` |
| rebuild | `python -m pip install -r requirements.txt` |

Ignore `.venv/` in Git; commit `requirements.txt`. Never name a file `random.py`, `csv.py` or `json.py`.

## Git branches and PRs

```bash
git switch -c feature/name      # new branch
git push -u origin feature/name # publish it, then open a PR on GitHub
git switch main && git pull     # update main
git merge feature/name          # merge locally
git merge --abort               # back out of a conflicted merge
git log --oneline --graph --all
```

Conflict: edit the file, keep the right code, **delete `<<<<<<<`, `=======`, `>>>>>>>`**, then `git add` and
`git commit`. Review the code, not the person; be specific; suggest a fix.

## Big-O

| Code | Cost |
|---|---|
| one loop over n | O(n) |
| loop inside loop over n | O(n²) |
| doubling / halving loop | O(log n) |
| `x in list`, `list.insert(0, x)`, `list.pop(0)` | O(n) |
| `x in set`, `d[k]` | O(1) average |
| `sorted()` | O(n log n) |

Sequential blocks add; nested blocks multiply; drop constants; state the worst case.

## This week

| Item | Details |
|---|---|
| **Deliverable** | Marks report pipeline in `/week-03` (CSV → summary JSON with error handling) and at least one PR merged into the team repo with review comments visible (Weekly Build WB-03) |
| **Practice quiz** | Python Collections, Files, Modules & Git Collaboration (untimed, retakes allowed) |
| **Weekly test** | 15 questions on Big-O, collections, files, exceptions and Git branching, 25 minutes |
| **DSA** | Analyse 10 snippets for complexity, Contains Duplicate (LC 217), Valid Anagram (LC 242), Majority Element (LC 169) |
| **Career task** | First peer code review: two written review comments on a classmate's PR |
