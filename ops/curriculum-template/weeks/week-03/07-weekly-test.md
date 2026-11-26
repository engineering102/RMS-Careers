---
type: quiz
title: "W3 · Weekly Test: Big-O, Collections, Files and Git Collaboration"
slug: w03-weekly-test
topic: Week 3 Assessment
subject: programming-fundamentals
quizType: formal
timeLimit: 25
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt test on complexity analysis, dicts and sets, files and exceptions, packaging and Git branching. 15 questions, 25 minutes.
---
Q: An outer loop runs `for i in range(n)` and an inner loop runs `for j in range(i + 1, n)` with constant work inside. What is the time complexity?
A) O(n)
B) O(n log n)
*C) O(n²)
D) O(2ⁿ)
Explanation: The inner loop runs (n-1) + (n-2) + ... + 1 = n(n-1)/2 times in total, which grows like n².

Q: i starts at 1 and the loop `while i < n: i *= 2` runs. What is its time complexity?
A) O(1)
*B) O(log n)
C) O(n)
D) O(n²)
Explanation: i doubles each time, so it reaches n after about log₂ n iterations.

Q: Which of these Python operations are O(1) on average? (Select all that apply.)
*A) `x in my_set`
*B) `my_dict[key]`
C) `x in my_list`
*D) `my_list.append(x)`
Explanation: Sets and dicts use hash tables, and appending to a list is O(1) amortised. Membership in a list scans the items, which is O(n).

Q: `result` is a list. What is the worst-case time complexity of `for x in nums: if x not in result: result.append(x)` for n numbers?
A) O(n)
B) O(log n)
*C) O(n²)
D) O(1)
Explanation: `x not in result` scans a list that can grow to n items, so it is a hidden inner loop. Using a set makes it O(n).

Q: Contains Duplicate is solved by adding each number to a set and returning True when a number is already in the set. What are its time and extra space complexities?
A) O(n²) time, O(1) space
*B) O(n) time, O(n) space
C) O(n log n) time, O(1) space
D) O(1) time, O(n) space
Explanation: One pass with O(1) average lookups, and the set may hold up to n values.

Q: Boyer–Moore voting finds the majority element in one pass. How much extra space does it use?
*A) O(1)
B) O(log n)
C) O(n)
D) O(n²)
Explanation: It keeps only a candidate and a counter, unlike a count map, which needs O(n) space.

Q: You need to store each student's marks and look them up quickly by roll number. Which collection fits best?
A) A list of marks
B) A tuple of marks
C) A set of roll numbers
*D) A dict mapping roll number to marks
Explanation: A dict gives direct lookup by key. A list needs a search, and a set stores no associated value.

Q: `d = {"a": 1}`. Which expression raises a KeyError?
A) d.get("b")
B) d.get("b", 0)
*C) d["b"]
D) "b" in d
Explanation: Indexing a missing key raises KeyError. get returns None or the default, and `in` returns False.

Q: Which expression creates an empty set?
A) {}
*B) set()
C) []
D) {()}
Explanation: {} is an empty dict. {()} is a set containing one empty tuple.

Q: `results.txt` already has 50 lines. A program opens it with `open("results.txt", "w")` and writes one line. How many lines does the file now have?
*A) 1
B) 50
C) 51
D) The program raises FileExistsError
Explanation: Mode "w" truncates the file first. Use "a" to append; "x" is the mode that raises FileExistsError.

Q: In a try / except / else / finally statement, which block runs only when the try block raised no exception?
A) except
*B) else
C) finally
D) None of them
Explanation: else runs only on success; finally runs in every case.

Q: A try block runs `int("abc")`. It is followed by `except ValueError: print("A")`, `else: print("B")` and `finally: print("C")`. What is printed?
A) A
B) B then C
*C) A then C
D) A, B then C
Explanation: int("abc") raises ValueError, so except runs, else is skipped and finally always runs.

Q: A CSV row contains marks 88. Using `csv.DictReader`, what is the value of `row["marks"]`?
A) The int 88
B) The float 88.0
*C) The string "88"
D) None until you call int()
Explanation: The csv module returns every field as a string; convert numbers yourself with int() or float().

Q: Which of these should be committed to a Python project's Git repository? (Select all that apply.)
*A) requirements.txt
*B) main.py
C) .venv/
D) __pycache__/
Explanation: Commit source code and the dependency list. The virtual environment and caches are rebuilt locally and belong in .gitignore.

Q: A merge stops with a conflict in report.py, and the file now contains `<<<<<<<`, `=======` and `>>>>>>>` lines. What is the correct way to finish the merge?
A) Run git push to let GitHub resolve it
B) Run git commit immediately; Git removes the markers itself
*C) Edit the file to the correct final code, delete the marker lines, then git add report.py and git commit
D) Delete report.py and commit
Explanation: You decide the final content and remove the markers; staging the file tells Git the conflict is resolved, and the commit completes the merge.
