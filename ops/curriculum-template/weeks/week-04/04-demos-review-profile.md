---
type: notes
title: "W4 · S4 · Project Demos, Code Review and Your GitHub Profile"
slug: w04-s4-demos-review-github-profile
topic: Demos & GitHub Profile
subject: career
minutes: 30
description: How to give a five-minute project demo, answer viva questions, give and act on peer code review, and set up a GitHub profile README with a photo, bio, skills and pinned repositories.
---
# Project demos, code review and your GitHub profile

Mini Project 1 is assessed on what it does **and** on how well you can show and explain it: the demo and viva carry 20
of the 100 marks. The same skills decide technical interviews, where "walk me through a project you built" is one of
the most common questions.

## The five-minute demo

Five minutes goes quickly. Plan it, and rehearse once with a timer.

| Time | What to show |
|---|---|
| 0:00–0:30 | The problem and who would use the app, in one or two sentences |
| 0:30–3:00 | A live run of the main flow: add data, the core feature, the summary or report |
| 3:00–4:00 | One thing that goes wrong and is handled: invalid input, a missing or corrupted data file |
| 4:00–5:00 | The design: your classes and how the files are split; who built what |

Tips:

- **Prepare data in advance.** A sample JSON file with a few records means you are not typing ten entries live.
  Keep a clean copy so you can reset it.
- **Show, do not read.** Have the terminal and the code open; avoid slides.
- **Increase the terminal font size** so the room can read it (Ctrl and + zooms the whole VS Code window).
- **Both partners speak.** Each demonstrates the features they own.
- If something breaks, say what you expected and move on. Explaining a bug calmly is better than hiding it.

## The viva: be ready to explain any line

Tutors will point at code and ask questions like these. Practise answering them for your own project.

- Why is this a class, and not a function or a dict?
- Which class is abstract, and what happens if a subclass forgets the abstract method?
- What does `super().__init__` do here?
- Where is the data saved, and what happens if the file is deleted or corrupted?
- Why did you use a dict (or list, or set) for this collection? What is the cost of a search?
- Show the issue and the PR for this feature. Who reviewed it?

If you cannot explain a line, you do not own it yet. Rewrite it in a way you understand.

## Peer code review in the session

After each demo, another pair reviews the repository using the feedback form. A useful review looks at:

| Area | Questions to ask |
|---|---|
| Correctness | Does the main flow work? Try an edge case: empty input, a negative amount, an unknown ID. |
| Design | Are the classes sensible? Is UI code kept out of the models? Any duplicated code? |
| Robustness | Does a missing or corrupted data file crash the app? Is invalid input rejected? |
| Readability | Clear names, docstrings, small functions? |
| Git practice | Issues, branches, PRs, meaningful commit messages, both partners committing? |
| README | Could a stranger install and run it from the README alone? |

Write at least **two specific comments** and **one strength**. As in Week 3: comment on the code, not the person, and
suggest a fix.

### Acting on review comments

1. Open a GitHub Issue for each comment you accept (so the work is visible on your board).
2. Fix each on a branch and merge through a PR that references the issue.
3. If you disagree with a comment, reply with your reasoning; that is a valid response too.

## Your GitHub profile README

Recruiters and interviewers often open your GitHub profile before or during an interview. A **profile README** is a
Markdown page shown at the top of your profile.

### Set it up

1. Create a **public** repository whose name is **exactly your GitHub username** (GitHub shows a note confirming that
   it is a special repository).
2. Tick **Add a README file** and create it.
3. Edit `README.md`; it now appears on `github.com/<your-username>`.

### What to include

```markdown
# Hi, I'm Asha Rao

Second-year CSE student building toward a **software developer** role.
Currently learning Python, SQL and data structures.

## Skills
Python · Git and GitHub · SQL (learning) · Problem solving (LeetCode)

## Projects
- **Library Manager**: object-oriented Python CLI with JSON persistence. [Repository](https://github.com/<you>/library-manager)
- **rms-weekly-labs**: weekly programs and DSA practice. [Repository](https://github.com/<you>/rms-weekly-labs)

## Contact
LinkedIn: <your profile link> · Email: <your email>
```

Keep it short, honest and up to date. List skills you can actually be questioned on.

### Profile settings

- **Photo**: a clear, professional head-and-shoulders picture (**Settings → Public profile**).
- **Name and bio**: your real name and a one-line bio matching your target role.
- **Pinned repositories**: on your profile page, use **Customize your pins** to pin up to six repositories. Pin Mini
  Project 1 and `rms-weekly-labs` now; you will add each new project as you build it.
- Give every pinned repository a one-line **description** (the gear icon next to "About" on the repository page) and a
  README.

### What to avoid

- Empty or "test" repositories pinned.
- Claims you cannot support ("expert in machine learning" after one tutorial).
- Committed secrets: passwords, API keys, `.env` files. Check before every push.

## Lab: feedback and fixes

- [ ] Deliver your five-minute demo; both partners present
- [ ] Complete the feedback form for the pair assigned to you (two specific comments and one strength)
- [ ] Turn the comments you received into issues; fix at least two through PRs
- [ ] Create your profile README; add a photo and bio; pin Mini Project 1 and `rms-weekly-labs`

## Check yourself

1. What should the last minute of your demo cover?
2. What must the repository be called for its README to appear on your GitHub profile?
3. A reviewer says "this is messy". How would you rewrite that comment so it is useful?
