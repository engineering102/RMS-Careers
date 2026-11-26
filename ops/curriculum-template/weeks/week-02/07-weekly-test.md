---
type: quiz
title: "W2 · Weekly Test: Loops, Functions, Strings and Lists"
slug: w02-weekly-test
topic: Week 2 Assessment
subject: programming-fundamentals
quizType: formal
timeLimit: 25
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt test on control flow, functions, strings, lists and this week's number problems. 15 questions, 25 minutes.
---
Q: What does `for i in range(10, 0, -3): print(i, end=" ")` print?
A) 10 7 4
*B) 10 7 4 1
C) 10 7 4 1 -2
D) 9 6 3
Explanation: range starts at 10 and steps by -3 while the value is greater than the stop (0): 10, 7, 4, 1.

Q: x = 15. An if/elif/else chain checks `x > 10` (prints "A"), then `x > 5` (prints "B"), else prints "C". What is printed?
*A) A
B) B
C) A and then B
D) C
Explanation: Only the first true branch runs. x > 10 is true, so the rest of the chain is skipped.

Q: When does the `else` block attached to a `for` loop run?
A) Only when the loop body never runs
B) After every iteration
*C) When the loop finishes without executing `break`
D) Only when an exception is raised inside the loop
Explanation: Loop-else runs when the loop ends normally. A break skips it, which makes it useful for "not found" cases.

Q: What does `print(sum(i for i in range(1, 6) if i % 2 == 1))` print?
A) 15
*B) 9
C) 6
D) 5
Explanation: The odd values in 1..5 are 1, 3 and 5, which sum to 9.

Q: `add(a, b)` contains only the line `print(a + b)` and no return statement. After `result = add(2, 3)`, what is stored in result?
A) 5
B) "5"
*C) None
D) The program raises an error
Explanation: print shows 5 on screen, but a function without return gives back None.

Q: Given `def greet(name, msg="Hello"): return f"{msg}, {name}"`, what does `greet("Ravi", "Hi")` return?
A) "Hello, Ravi"
*B) "Hi, Ravi"
C) "Ravi, Hi"
D) An error, because msg already has a default
Explanation: A positional argument overrides the default value, so msg is "Hi".

Q: Which function definition is a SyntaxError?
A) def f(a, b=1):
*B) def f(a=1, b):
C) def f(*args, **kwargs):
D) def f(a, *args):
Explanation: A parameter without a default cannot follow one that has a default.

Q: `count = 0` is defined at the top of a file. A function contains the single line `count = count + 1`. What happens when the function is called?
A) The global count becomes 1
B) A new local count is created with value 1
*C) UnboundLocalError, because count is treated as local but has no value yet
D) Nothing; the line is ignored
Explanation: Assigning to count inside the function makes it local, so reading it on the right side fails. Pass it in and return it instead.

Q: s = "placement". Which expressions evaluate to "ment"? (Select all that apply.)
*A) s[-4:]
*B) s[5:]
C) s[5:8]
D) s[-4:-1]
Explanation: "ment" starts at index 5 (or -4) and runs to the end. s[5:8] and s[-4:-1] stop before the last character and give "men".

Q: What happens when you run `s = "cat"` followed by `s[0] = "b"`?
A) s becomes "bat"
B) s becomes "bcat"
*C) TypeError, because strings are immutable
D) IndexError
Explanation: You cannot assign to a position in a string. Build a new one instead: "b" + s[1:].

Q: `marks = [3, 1, 2]` then `marks = marks.sort()` then `print(marks)`. What is printed?
A) [1, 2, 3]
B) [3, 1, 2]
*C) None
D) An error
Explanation: list.sort() sorts in place and returns None, and that None is assigned back to marks. Use sorted(marks) for a new list.

Q: `a = [1, 2]`, then `b = a`, then `b.append(3)`. What does `print(a)` show?
A) [1, 2]
*B) [1, 2, 3]
C) [1, 2, [3]]
D) An error
Explanation: b = a does not copy the list; both names refer to the same list object. Use a.copy() for a separate list.

Q: Which expressions produce the list [0, 2, 4, 6, 8]? (Select all that apply.)
*A) [n for n in range(10) if n % 2 == 0]
*B) list(range(0, 10, 2))
*C) [n * 2 for n in range(5)]
D) list(range(0, 8, 2))
Explanation: range(0, 8, 2) stops before 8 and gives [0, 2, 4, 6]. The other three all give 0, 2, 4, 6, 8.

Q: The VS Code debugger is paused on a line that calls `calculate_total(marks)`. You want to see what happens inside that function. Which action do you use?
A) Step Over (F10)
*B) Step Into (F11)
C) Step Out (Shift+F11)
D) Continue (F5)
Explanation: Step Into enters the called function. Step Over runs the whole call as one step.

Q: Starting with `a, b = 48, 18`, the loop `while b: a, b = b, a % b` runs until b is 0. What is the value of a at the end?
A) 2
*B) 6
C) 18
D) 144
Explanation: (48, 18) → (18, 12) → (12, 6) → (6, 0). This is Euclid's algorithm, and a ends as gcd(48, 18) = 6.
