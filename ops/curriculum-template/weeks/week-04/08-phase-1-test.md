---
type: quiz
title: "Phase 1 Test: Foundations & Engineering Tools"
slug: phase-1-test
topic: Phase 1 Assessment
subject: programming-fundamentals
quizType: formal
timeLimit: 45
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt test covering Weeks 1–4: the command line, Git and GitHub, Python core, collections, files and modules, object-oriented Python, Big-O, arrays and hashing. 30 questions, 45 minutes.
---
Q: You are in C:\Users\asha\labs. You run `mkdir week-05`, then `cd week-05`, then `cd ..`. Which folder are you in now?
*A) C:\Users\asha\labs
B) C:\Users\asha\labs\week-05
C) C:\Users\asha
D) C:\
Explanation: mkdir does not change folder; cd week-05 enters the new folder and cd .. goes back up one level.

Q: Which Bash command lists every file in the current folder, including hidden ones such as .gitignore?
A) ls
*B) ls -la
C) pwd
D) cd -a
Explanation: The -a flag includes hidden entries (names starting with a dot), and -l shows details.

Q: What is the correct order to publish an edited file to GitHub?
A) git commit → git add → git push
*B) git add → git commit → git push
C) git push → git add → git commit
D) git add → git push → git commit
Explanation: Stage the change, record it as a commit, then upload the commit.

Q: `git status` lists notes.py under "Untracked files". What does that mean?
A) notes.py has been committed but not pushed
*B) Git is not tracking notes.py yet; git add is needed to include it
C) notes.py is listed in .gitignore
D) notes.py has a merge conflict
Explanation: Untracked files exist in the folder but have never been staged or committed.

Q: A student committed .env with an API key, then added .env to .gitignore. Why is the key still a problem?
A) .gitignore only works after git push
*B) .gitignore does not untrack files that are already committed, and the key remains in the history
C) .gitignore deletes the file from GitHub only
D) It is not a problem; .gitignore removes the file from every commit
Explanation: .gitignore affects only untracked files. A committed secret stays in history and should be revoked and replaced.

Q: What does `git switch -c feature/csv-export` do?
A) Deletes the branch feature/csv-export
B) Switches to an existing branch only
*C) Creates a new branch called feature/csv-export and switches to it
D) Pushes the branch to GitHub
Explanation: -c means create; git checkout -b does the same in older syntax.

Q: When is a merge a "fast-forward"?
*A) When the target branch has no new commits since the other branch started, so Git just moves its label forward
B) When both branches changed the same lines
C) When the merge is done on GitHub instead of locally
D) When the branch contains only one commit
Explanation: With no diverging commits, no merge commit is needed; the branch pointer simply advances.

Q: A pull request description contains the line `Closes #4`. What happens when the PR is merged into the default branch?
A) Pull request 4 is closed
*B) Issue 4 is closed automatically
C) The branch named 4 is deleted
D) Nothing; it is only a comment
Explanation: Closing keywords such as Closes, Fixes and Resolves link the PR to the issue and close it on merge.

Q: Which description of `git pull` is correct?
A) It uploads local commits to GitHub
*B) It fetches new commits from the remote and merges them into the current branch
C) It only downloads commits without changing your files
D) It creates a pull request
Explanation: git pull is git fetch followed by a merge. git fetch alone downloads without merging.

Q: What does `print(7 // 2 * 2 + 7 % 2)` print?
A) 8
*B) 7
C) 7.0
D) 6
Explanation: 7 // 2 is 3, times 2 is 6, and 7 % 2 is 1, giving 7.

Q: What happens when Python runs `int("3.5")`?
A) It returns 3
B) It returns 4
C) It returns 3.5
*D) It raises ValueError
Explanation: int() cannot parse a string containing a decimal point. Use int(float("3.5")) to get 3.

Q: What does `print(bool(""), bool("0"), bool([]))` print?
*A) False True False
B) False False False
C) True True False
D) False True True
Explanation: Empty strings and empty lists are falsy. "0" is a non-empty string, so it is truthy.

Q: What does `print([x * 2 for x in range(4) if x != 2])` print?
A) [0, 2, 4, 6]
*B) [0, 2, 6]
C) [2, 6]
D) [0, 1, 3]
Explanation: x takes 0, 1 and 3 (2 is filtered out), and each is doubled.

Q: Given `def add(x, items=[]): items.append(x); return items`, you call `add(1)` and then `print(add(2))`. What is printed?
A) [2]
*B) [1, 2]
C) [1]
D) An error
Explanation: The default list is created once and shared between calls. Use items=None and create the list inside the function.

Q: What does `"Data Science".split()[1][::-1]` evaluate to?
A) "Science"
*B) "ecneicS"
C) "ataD"
D) "ecneicS ataD"
Explanation: split() gives ["Data", "Science"]; index 1 is "Science", and [::-1] reverses it.

Q: What is `len("a,b,,c".split(","))`?
A) 3
*B) 4
C) 5
D) 6
Explanation: The split gives ["a", "b", "", "c"]: the two adjacent commas produce an empty string.

Q: Each character of "banana" is counted with `freq[ch] = freq.get(ch, 0) + 1`, starting from an empty dict. What is freq at the end?
A) {"b": 1, "a": 1, "n": 1}
*B) {"b": 1, "a": 3, "n": 2}
C) {"banana": 1}
D) A KeyError on the first character
Explanation: get returns 0 for a missing key, so each character's count starts at 0 and is incremented.

Q: What is `{1, 2, 3} & {2, 3, 4}`?
A) {1, 2, 3, 4}
*B) {2, 3}
C) {1, 4}
D) {1}
Explanation: & is set intersection: the values present in both sets.

Q: Which of these can be used as dictionary keys? (Select all that apply.)
*A) "roll_101"
*B) (101, "CSE")
C) [101, "CSE"]
*D) 101
Explanation: Keys must be hashable. Strings, numbers and tuples of immutable values are; lists are mutable and are not.

Q: What is the main advantage of `with open("data.txt") as f:` over calling open() and close() yourself?
A) It reads the file faster
*B) The file is closed automatically when the block ends, even if an error occurs
C) It creates the file if it does not exist
D) It prevents the file from being modified
Explanation: The context manager guarantees cleanup. Whether a missing file is created depends on the mode, not on with.

Q: A program calls json.load on a data file that has been corrupted with random text. Which exception is raised?
A) FileNotFoundError
B) KeyError
*C) json.JSONDecodeError
D) TypeError
Explanation: json raises JSONDecodeError (a subclass of ValueError) when the text is not valid JSON. Mini Project 1 must catch it and start fresh with a warning.

Q: A teammate clones your project, which contains requirements.txt. After creating and activating a virtual environment, which command installs the same packages?
A) python -m pip freeze > requirements.txt
*B) python -m pip install -r requirements.txt
C) python -m venv requirements.txt
D) git pull requirements.txt
Explanation: pip install -r reads the list of packages from the file. pip freeze is how the file was created.

Q: Why do module files put their test calls under `if __name__ == "__main__":`?
A) To make the tests run faster
*B) So the tests run when the file is executed directly, but not when another file imports it
C) Because Python requires it in every file
D) To hide the functions from other modules
Explanation: When a file is imported, __name__ is the module's name, so the block is skipped.

Q: Which statements about object-oriented Python are correct? (Select all that apply.)
*A) A property setter can validate a value when it is assigned
B) An abstract class with at least one abstract method can be instantiated as long as it also has a concrete method
*C) super().__init__(...) runs the parent class's initialiser on the current object
*D) Overriding means a subclass defines a method with the same name as one in its parent
Explanation: Any unimplemented abstract method blocks instantiation, regardless of concrete methods. The other three statements are correct.

Q: A class defines both `__str__` and `__repr__`. Which method does `print(obj)` use?
*A) __str__
B) __repr__
C) Both, one after the other
D) __init__
Explanation: print and str() use __str__; the REPL, repr() and printing a list use __repr__.

Q: Shapes is a list holding Circle, Rectangle and Triangle objects, each defining its own area() method. The code `total = sum(s.area() for s in shapes)` works without checking types. Which OOP idea does this show?
A) Encapsulation
*B) Polymorphism
C) Composition
D) Abstraction only
Explanation: The same call behaves differently for each type of object, so the caller does not need to know which type it has.

Q: An outer loop runs `for i in range(n)`, and inside it `j = 1` and `while j < n: j *= 2`. What is the overall time complexity?
A) O(n)
*B) O(n log n)
C) O(n²)
D) O(log n)
Explanation: The inner loop runs about log₂ n times, and it runs once for each of the n outer iterations.

Q: Which of these run in O(n) time for a list nums of length n? (Select all that apply.)
*A) One loop over nums doing constant work per item
*B) Two separate loops over nums, one after the other
C) One loop over nums that checks `x in other_list`, where other_list also has n items
*D) One loop over nums that checks `x in seen`, where seen is a set
Explanation: Sequential loops add (n + n = O(n)) and set lookups are O(1) on average. Membership in a list is O(n), making C O(n²).

Q: Which approach checks whether two strings of length n are anagrams in O(n) time?
A) Compare every character of one string with every character of the other
B) Sort both strings and compare them
*C) Count characters of the first string in a dict, then decrement the counts using the second string
D) Check whether the strings are equal
Explanation: Counting is one pass over each string. Sorting works but costs O(n log n), and comparing every pair is O(n²).

Q: nums = [1, 2, 3, 4, 5, 6, 7] is rotated to the right by k = 10 using the reversal method (k %= n, reverse all, reverse the first k, reverse the rest). What is the result?
A) [4, 5, 6, 7, 1, 2, 3]
*B) [5, 6, 7, 1, 2, 3, 4]
C) [1, 2, 3, 4, 5, 6, 7]
D) An IndexError, because k is larger than the list
Explanation: k %= 7 gives 3, so the last three values move to the front.
