---
type: resource
title: "W1 · Cheat Sheet: Setup Checklist, Terminal, Git and Python Basics"
slug: w01-cheat-sheet
topic: Week 1 Reference
subject: dev-tools
minutes: 10
description: One-page reference for Week 1 — the setup checklist, everyday terminal and Git commands, Python operators, this week's deliverable and career task.
---
# Week 1 cheat sheet

## Setup checklist

- [ ] **VS Code** installed, with the Python extension
- [ ] **Python 3.12+**: `python --version` prints 3.12 or later (macOS/Linux: `python3 --version`)
- [ ] **Git**: `git --version` works
- [ ] Git identity set: `git config --global user.name` and `user.email`
- [ ] **GitHub** account created; you can push to a test repository
- [ ] **LeetCode** account created (needed from Week 2)

If a command is "not recognized", reinstall with **Add to PATH** ticked and restart the terminal.

## Terminal

| Task | Command |
|---|---|
| Where am I? | `pwd` |
| List files | `ls` (Bash: `ls -la` for hidden files) |
| Change folder / go up / go home | `cd name` · `cd ..` · `cd ~` |
| New folder | `mkdir name` |
| Move or rename | `mv old new` |
| Copy | `cp a b` |
| Delete file / folder | `rm file` · `rm -r folder` (permanent!) |
| Open folder in VS Code | `code .` |

Press **Tab** to autocomplete names. Press **↑** to repeat earlier commands.

## Git

```bash
git status                       # always start here
git add <file>   |  git add .    # stage
git commit -m "Verb + what changed"
git log --oneline                # history
git diff                         # unstaged changes
git push                         # upload (after the first push -u origin main)
git clone <url>                  # copy a repository
```

First push of a new repository:

```bash
git remote add origin https://github.com/<you>/rms-weekly-labs.git
git branch -M main
git push -u origin main
```

## Python basics

```python
x = int(input("n: "))         # input() returns str; convert it
print(f"Value: {x:.2f}")      # f-string, 2 decimals
7 / 2 == 3.5     7 // 2 == 3     7 % 2 == 1     2 ** 3 == 8
n % 10   # last digit      n // 10   # drop last digit
```

## This week

| Item | Details |
|---|---|
| **Deliverable** | GitHub repository `rms-weekly-labs` with a `/week-01` folder and a README (Weekly Build WB-01) |
| **Practice quiz** | Orientation, Developer Toolkit & Git Basics (untimed, retakes allowed) |
| **Weekly test** | 15 questions on Git, the terminal and Python basics, 25 minutes |
| **DSA** | Pattern printing, largest of three, digit sum and reverse, Fizz Buzz |
| **Career task** | Record your primary and backup target roles in your progress tracker |
