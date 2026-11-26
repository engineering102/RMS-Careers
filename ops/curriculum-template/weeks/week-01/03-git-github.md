---
type: notes
title: "W1 · S3 · Git and GitHub Basics"
slug: w01-s3-git-github-basics
topic: Git & GitHub
subject: dev-tools
minutes: 35
description: Why version control exists, the init–add–commit cycle, reading history with log and diff, .gitignore, good commit messages, and publishing to GitHub.
---
# Git and GitHub basics

## Why version control?

Without version control, projects end up as `final.py`, `final2.py`, `final_really.py`. **Git** records snapshots of
your project so you can:

- see exactly what changed, when and why;
- go back to any earlier version;
- work with others without overwriting each other's work.

**Git** is the tool on your machine. **GitHub** is a website that hosts Git repositories online so you can back them
up, share them and collaborate.

## The three areas

```text
working directory  --git add-->  staging area  --git commit-->  repository (history)
```

- **Working directory**: the files you edit.
- **Staging area**: the changes you have chosen to include in the next snapshot.
- **Repository**: the saved history of commits (inside the hidden `.git` folder).

## One-time setup

```bash
git config --global user.name "Asha Rao"
git config --global user.email "asha@example.com"   # use the email on your GitHub account
git config --global init.defaultBranch main
```

## The everyday cycle

```bash
git init                 # start tracking this folder (once per project)
git status               # what has changed? run this often
git add hello.py         # stage one file
git add .                # stage everything that changed
git commit -m "Add hello world program"
git log --oneline        # history, one line per commit
git diff                 # unstaged changes, line by line
git diff --staged        # what you are about to commit
```

Read `git status` output carefully. It always tells you what to do next.

## .gitignore

Some files should never be committed: caches, virtual environments, secrets.

```gitignore
__pycache__/
*.pyc
.venv/
.env
.DS_Store
```

Put this in a file named `.gitignore` at the project root **before** your first commit.

> **Never commit passwords, API keys or `.env` files.** Once pushed, assume they are public and leaked, even if you
> delete them later.

## Writing good commit messages

A commit message explains **why** the change exists to a reader months from now.

| Weak | Strong |
|---|---|
| `update` | `Add input validation to temperature converter` |
| `fixed stuff` | `Fix off-by-one error in digit reversal loop` |
| `final` | `Add README with run instructions` |

Rules of thumb: start with a verb in the imperative ("Add", "Fix", "Refactor"), keep the first line under about 60
characters, and make one logical change per commit.

## Publishing to GitHub

1. On GitHub, click **New repository**, name it `rms-weekly-labs`, leave it empty (no README), and create it.
2. Connect your local repository and push:

```bash
git remote add origin https://github.com/<your-username>/rms-weekly-labs.git
git branch -M main
git push -u origin main
```

`-u` remembers the link, so later you only type `git push`.

### Authentication

GitHub no longer accepts your account password on the command line.

- **HTTPS**: Git Credential Manager (installed with Git for Windows) opens a browser to sign in, or you use a
  **personal access token**.
- **SSH**: generate a key with `ssh-keygen -t ed25519`, add the public key (`.pub`) in GitHub → Settings → SSH keys,
  and use the `git@github.com:...` remote URL.

## Cloning

To copy an existing repository to your machine:

```bash
git clone https://github.com/<user>/<repo>.git
```

## Lab: your weekly labs repository

1. Create `rms-weekly-labs` locally with a `week-01/` folder and a `README.md` describing the repository.
2. Add a `.gitignore` for Python.
3. Make your first commit and push it to GitHub.
4. Open the repository on GitHub and check that the README renders.

You will add a folder to this repository every week of the programme.

## Check yourself

1. What is the difference between `git add` and `git commit`?
2. You edited a file, then ran `git commit -m "..."`, but the change is not in the commit. What did you forget?
3. Why must `.env` go in `.gitignore` before the first commit, not after?
