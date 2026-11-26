---
type: notes
title: "W1 · S2 · Command Line Essentials and VS Code"
slug: w01-s2-command-line-vs-code
topic: Command Line & VS Code
subject: dev-tools
minutes: 30
description: Navigate the file system from the terminal, understand absolute and relative paths, manage files with commands, and set up VS Code for daily work.
---
# Command line essentials and VS Code

Every developer tool you will use (Git, Python, npm, Docker, cloud CLIs) is driven from a terminal. Getting comfortable
here early saves hours every week.

## Shells: PowerShell and Bash

A **shell** reads the commands you type and runs them.

- **Windows** ships with **PowerShell**. Git for Windows also installs **Git Bash**.
- **macOS and Linux** use **Bash** or **Zsh**.

Most everyday commands have the same name in both. Where they differ, this sheet shows both.

## Where am I? Paths

The file system is a tree of folders (directories). Your terminal always has a **current working directory**.

```bash
pwd            # print the current directory (works in PowerShell too)
```

- An **absolute path** starts from the root: `C:\Users\asha\projects` or `/home/asha/projects`.
- A **relative path** starts from where you are: `projects/week-01`, `../notes`.

Special names:

| Name | Meaning |
|---|---|
| `.` | the current directory |
| `..` | the parent directory |
| `~` | your home directory |

## Moving around

```bash
ls             # list files (PowerShell: ls or dir)
ls -la         # Bash: include hidden files, long format
cd projects    # go into a folder
cd ..          # go up one level
cd ~           # go home
```

**Tab completion**: type the first few letters of a name and press **Tab**. Use it constantly; it prevents typos.

## Creating, copying, moving, deleting

| Task | Bash | PowerShell |
|---|---|---|
| Make a folder | `mkdir week-01` | `mkdir week-01` |
| Make nested folders | `mkdir -p a/b/c` | `mkdir a/b/c` |
| Create an empty file | `touch notes.txt` | `New-Item notes.txt` |
| Copy | `cp a.txt b.txt` | `Copy-Item a.txt b.txt` (or `cp`) |
| Move / rename | `mv a.txt docs/` | `Move-Item a.txt docs/` (or `mv`) |
| Delete a file | `rm a.txt` | `Remove-Item a.txt` (or `rm`) |
| Delete a folder | `rm -r old/` | `Remove-Item -Recurse old` |
| Show a file | `cat notes.txt` | `Get-Content notes.txt` (or `cat`) |

> **Careful:** `rm` does not use the Recycle Bin. Deleted means gone. Double-check the path before pressing Enter,
> especially with `-r`.

## Spaces in names

Avoid spaces in folder and file names for code (`week-01`, not `Week 01`). If a path has spaces, wrap it in quotes:

```bash
cd "My Projects"
```

## Running programs

```bash
python --version      # check Python is installed (macOS/Linux may need python3)
git --version
code .                # open the current folder in VS Code
```

If a command is "not recognized", the program is either not installed or not on your **PATH** (the list of folders
the shell searches). Reinstalling with "Add to PATH" ticked usually fixes it. Restart the terminal afterwards.

## VS Code setup

Install these extensions:

- **Python** (Microsoft): run, debug and lint Python.
- **GitLens** (optional): see who changed each line and when.

Shortcuts worth learning this week:

| Action | Windows / Linux | macOS |
|---|---|---|
| Command palette | Ctrl+Shift+P | Cmd+Shift+P |
| Open file by name | Ctrl+P | Cmd+P |
| Toggle terminal | Ctrl+` | Ctrl+` |
| Comment line | Ctrl+/ | Cmd+/ |
| Multi-cursor | Alt+Click | Option+Click |
| Format document | Shift+Alt+F | Shift+Option+F |

Use the **integrated terminal** (Ctrl+`) so the editor and terminal share the same folder.

## Lab: terminal scavenger hunt

Using **only commands**, build this structure inside your home directory, then list it:

```text
rms-weekly-labs/
├── README.md
├── week-01/
│   ├── programs/
│   └── notes.txt
└── week-02/
```

Then:

1. Move `notes.txt` into `programs/`.
2. Rename it to `scratch.txt`.
3. Delete it.
4. Print the absolute path of `week-01`.

## Check yourself

1. You are in `/home/asha/rms-weekly-labs/week-01`. What does `cd ../week-02` do?
2. What is the difference between `rm notes.txt` and `rm -r notes`?
3. Why should code folders avoid spaces in their names?
