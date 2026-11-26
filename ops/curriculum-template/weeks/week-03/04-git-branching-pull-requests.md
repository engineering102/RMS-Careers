---
type: notes
title: "W3 · S4 · Git Branching, Merge Conflicts and Pull Requests"
slug: w03-s4-git-branching-pull-requests
topic: Git Collaboration
subject: dev-tools
minutes: 40
description: Creating and switching branches, merging, resolving merge conflicts step by step, GitHub pull requests, code review etiquette and forks, with a team exercise where everyone ships a feature through a PR.
---
# Git branching, merge conflicts and pull requests

In Week 1 you committed straight to `main` in your own repository. In a team, that breaks quickly: two people edit at
once, half-finished work lands on `main`, and nobody reviews anything. **Branches** and **pull requests** solve this.

## Branches

A branch is a **movable label pointing to a commit**. `main` is just the default branch. When you create a branch and
commit on it, only that label moves forward; `main` stays where it was.

```text
main:              A ── B ── C
                             \
feature/top-three:            D ── E
```

```bash
git branch                          # list branches; * marks the current one
git switch -c feature/top-three     # create a branch and switch to it
git switch main                     # switch back
git branch -d feature/top-three     # delete a branch that has been merged
```

`git checkout -b name` is the older equivalent of `git switch -c name`; you will see both online.

Name branches by purpose: `feature/csv-export`, `fix/empty-file-crash`, `docs/readme-setup`.

Switching branches changes the files in your folder to match that branch. Commit (or stash) your work before switching,
or Git may refuse in order to protect uncommitted changes.

## Merging

To bring a branch's commits into `main`:

```bash
git switch main
git pull                     # make sure main is up to date first
git merge feature/top-three
```

Two outcomes:

| Situation | What Git does |
|---|---|
| `main` has no new commits since the branch started | **fast-forward**: simply moves `main` to the branch's last commit |
| both have new commits | creates a **merge commit** with two parents, combining both histories |

`git log --oneline --graph --all` draws the branch structure in the terminal.

## Merge conflicts

Git merges automatically when changes touch different lines. If **both branches changed the same lines** of the same
file, Git cannot know which version is right and stops with a conflict:

```text
CONFLICT (content): Merge conflict in report.py
Automatic merge failed; fix conflicts and then commit the result.
```

The file now contains both versions between markers:

```text
<<<<<<< HEAD
TITLE = "Marks Report"
=======
TITLE = "Semester Marks Report"
>>>>>>> feature/title
```

- Between `<<<<<<< HEAD` and `=======`: the version on your current branch.
- Between `=======` and `>>>>>>>`: the version from the branch being merged.

To resolve:

1. Open the file. Decide what the final code should be: one side, the other, or a combination.
2. **Delete all three marker lines** and leave only the correct code.
3. Run the program to check it still works.
4. Stage and commit:

```bash
git add report.py
git commit                    # Git pre-fills a merge commit message
```

VS Code highlights conflicts and offers **Accept Current**, **Accept Incoming** and **Accept Both** buttons above
each block. They are helpful, but always read the result: "Accept Both" often produces duplicate or broken code.

If you get lost, `git merge --abort` returns everything to how it was before the merge.

How to have fewer conflicts: keep branches short-lived, pull `main` often, and avoid reformatting whole files in the
same branch as a feature.

## Remote branches

```bash
git push -u origin feature/top-three   # publish the branch to GitHub
git fetch                              # download new commits and branches (no merge)
git pull                               # fetch + merge into the current branch
```

## Pull requests

A **pull request** (PR) is a GitHub page that says "please merge my branch into `main`". It shows the diff, runs any
checks, and is where teammates review the code before it is merged.

The flow for every feature:

1. `git switch main` and `git pull`.
2. `git switch -c feature/<name>`; make small, focused commits.
3. `git push -u origin feature/<name>`.
4. On GitHub, click **Compare & pull request**. Write a clear title and description: what changed, why, how to test it.
5. Request a reviewer. Respond to comments by pushing more commits to the same branch; the PR updates automatically.
6. When approved, merge on GitHub, then delete the branch. Locally: `git switch main`, `git pull`.

A good PR description:

```text
Add top-3 students per subject

- New function top_n(summary, subject, n=3) in report.py
- Ties are broken by name so output is stable
- Tested with sample_marks.csv (output pasted below)

Closes #4
```

`Closes #4` links the PR to issue 4 and closes the issue when the PR is merged.

## Code review etiquette

Reviewing is a skill you will be judged on in internships and jobs.

**As a reviewer**

- Review the **code, not the person**: "This loop reads the file twice" rather than "You wrote this badly".
- Be specific and suggest a fix: "`marks` could be empty here; maybe return 0 before dividing?"
- Separate must-fix issues from optional suggestions (many teams prefix minor points with "nit:").
- Mention something done well. It is useful information, not just politeness.
- Ask questions when you are unsure: "What happens if the CSV has no header?"

**As an author**

- Keep PRs small enough to review in about ten minutes.
- Reply to every comment, either with a fix or with your reasoning.
- Do not take comments personally; they make the code (and you) better.

## Forks

A **fork** is your own copy of someone else's repository on GitHub. You use it when you do not have permission to push
to the original, which is the normal way to contribute to open-source projects:

1. Fork the repository on GitHub.
2. Clone **your fork**, create a branch, commit and push to your fork.
3. Open a PR from your fork's branch to the original repository.

Inside your team repository this week you will be added as collaborators, so you will use branches directly, not forks.

## Lab: team feature exercise

Teams of 3–4, one shared repository (one member creates it and adds the others as collaborators).

1. Start from a shared `report.py` that reads a marks CSV and prints a summary.
2. Each member picks one feature (for example: top 3 per subject, CSV export, a text grade histogram) and works on
   `feature/<name>`.
3. Each member opens a PR and **reviews one teammate's PR with at least two written comments**.
4. Your tutor will arrange for two members to edit the same lines. When the second PR conflicts, resolve it locally
   (merge `main` into your branch, fix the markers, commit, push) so the PR becomes mergeable.
5. Merge every PR. The deliverable is at least one merged PR of yours, with review comments visible.

## Check yourself

1. What is the difference between a fast-forward merge and a merge commit?
2. You see `<<<<<<<`, `=======` and `>>>>>>>` in a file. What must you do before committing?
3. When would you fork a repository instead of creating a branch in it?
