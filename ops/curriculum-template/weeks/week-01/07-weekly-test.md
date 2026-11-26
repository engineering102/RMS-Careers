---
type: quiz
title: "W1 · Weekly Test: Terminal, Git and Python Basics"
slug: w01-weekly-test
topic: Week 1 Assessment
subject: dev-tools
quizType: formal
timeLimit: 25
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt test on the command line, Git basics and first Python programs. 15 questions, 25 minutes.
---
Q: You are in /home/asha/labs/week-01. Which command takes you to /home/asha/labs/week-02?
A) cd week-02
*B) cd ../week-02
C) cd /week-02
D) cd ~/week-02
Explanation: .. moves up to /home/asha/labs, then into week-02. ~/week-02 would be /home/asha/week-02.

Q: Which statement about `rm -r old/` is true?
A) It moves the folder to the Recycle Bin
*B) It deletes the folder and everything inside it permanently
C) It only deletes empty folders
D) It renames the folder to old.bak
Explanation: rm does not use the Recycle Bin, and -r removes the folder recursively.

Q: Which path is absolute?
A) projects/week-01
B) ../notes
*C) C:\Users\asha\projects
D) ./main.py
Explanation: An absolute path starts from the root of the file system (a drive or /).

Q: What does `git add hello.py` do?
A) Saves a commit containing hello.py
*B) Stages the current changes to hello.py for the next commit
C) Uploads hello.py to GitHub
D) Starts tracking the whole folder as a repository
Explanation: add moves changes into the staging area; commit records them; push uploads.

Q: You edited app.py and ran `git commit -m "Fix bug"`, but Git says "nothing added to commit". What was missed?
A) git push
B) git init
*C) git add app.py
D) git log
Explanation: Changes must be staged with git add before commit includes them.

Q: Which command shows the changes that are staged and about to be committed?
A) git diff
*B) git diff --staged
C) git log --oneline
D) git status --short
Explanation: Plain git diff shows unstaged changes; --staged shows what the next commit will contain.

Q: Which of these should be listed in .gitignore for a Python project? (Select all that apply.)
*A) .env
*B) __pycache__/
*C) .venv/
D) README.md
Explanation: Secrets, caches and virtual environments must not be committed. The README should be.

Q: Which commit message follows good practice?
A) update
B) final changes!!
*C) Add input validation to temperature converter
D) asdf
Explanation: Imperative verb, specific about what changed, short first line.

Q: What does `git push -u origin main` do the first time it is run?
A) Creates a new repository on GitHub
*B) Uploads the main branch to the remote named origin and remembers the link for future pushes
C) Downloads the latest changes from GitHub
D) Deletes the remote branch and recreates it
Explanation: -u sets the upstream, so later a plain git push is enough.

Q: What is the type of the value returned by `input()`?
A) int
B) float
*C) str
D) It depends on what the user types
Explanation: input() always returns a string; convert it with int() or float().

Q: What does `print(17 // 5, 17 % 5)` print?
A) 3.4 2
*B) 3 2
C) 3 3
D) 3.4 0.4
Explanation: // is floor division (3) and % is the remainder (2).

Q: What is the result of `10 / 2` in Python 3?
A) 5
*B) 5.0
C) 5 (as a string)
D) An error
Explanation: The / operator always returns a float.

Q: Which line raises a TypeError?
A) x = int("12") + 1
*B) y = "Age: " + 20
C) z = str(20) + " years"
D) w = 3 * "ab"
Explanation: A str cannot be concatenated with an int. 3 * "ab" is valid and gives "ababab".

Q: n = 4827. Which expressions give 7 and 482? (Select all that apply.)
*A) n % 10
*B) n // 10
C) n / 10
D) n % 100
Explanation: n % 10 is the last digit; n // 10 drops it. n / 10 is 482.7 and n % 100 is 27.

Q: In Fizz Buzz, why must the "divisible by 15" check come before the "divisible by 3" check?
A) Because 15 is larger than 3
*B) Otherwise numbers like 15 match the divisible-by-3 branch first and print "Fizz"
C) Because % is slower for larger divisors
D) The order of the checks does not matter
Explanation: In an if/elif chain the first true condition wins, so the most specific case goes first.
