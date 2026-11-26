---
type: quiz
title: "W10 · Weekly Test: JavaScript Fundamentals, the DOM and Backtracking"
slug: w10-weekly-test
topic: Week 10 Assessment
subject: web-development
quizType: formal
timeLimit: 25
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt test on modern JavaScript, array methods, DOM events and localStorage, plus recursion and backtracking. 15 questions, 25 minutes.
---
Q: What does `console.log("5" + 3, "5" - 3)` print?
A) 8 2
*B) 53 2
C) 53 NaN
D) 8 "2"
Explanation: + joins strings when either side is a string; - only works on numbers, so "5" is converted to 5.

Q: Which line causes an error?
A) const marks = [80, 90]; marks.push(70);
*B) const total = 10; total = 20;
C) let count = 0; count += 1;
D) const student = { name: "Asha" }; student.name = "Ravi";
Explanation: const prevents reassignment, not mutation. Pushing to a const array or changing a property is allowed.

Q: Which values are falsy in JavaScript? (Select all that apply.)
*A) 0
*B) ""
C) []
*D) null
Explanation: An empty array (and an empty object) is truthy in JavaScript, unlike Python.

Q: `const retries = config.retries || 3;` The user set config.retries to 0. What is retries, and what should be written to keep the 0?
A) 0; the code is already correct
*B) 3; use config.retries ?? 3
C) undefined; use config.retries && 3
D) 3; use config.retries === 3
Explanation: || falls back on any falsy value, including 0. ?? falls back only on null or undefined.

Q: What does `[10, 9, 1, 100].sort()` return?
A) [1, 9, 10, 100]
*B) [1, 10, 100, 9]
C) [100, 10, 9, 1]
D) [10, 9, 1, 100]
Explanation: Without a compare function, sort compares items as strings. Use sort((a, b) => a - b) for numbers.

Q: What does `[1, 2, 3, 4].filter((n) => n % 2 === 0).map((n) => n * 10)` return?
A) [10, 30]
*B) [20, 40]
C) [false, true, false, true]
D) 60
Explanation: filter keeps 2 and 4; map multiplies each by 10.

Q: What does `[3, 5, 7].reduce((acc, n) => acc + n, 10)` return?
A) 15
*B) 25
C) 10
D) [13, 15, 17]
Explanation: The accumulator starts at 10, then adds 3, 5 and 7.

Q: Given `const { name, ...rest } = { name: "Asha", branch: "CSE", year: 3 };`, what is rest?
A) ["branch", "year"]
*B) { branch: "CSE", year: 3 }
C) { name: "Asha", branch: "CSE", year: 3 }
D) undefined
Explanation: Rest in object destructuring collects the properties that were not picked out.

Q: `const a = { info: { city: "Hyderabad" } }; const b = { ...a }; b.info.city = "Pune";` What is a.info.city?
A) Hyderabad
*B) Pune
C) undefined
D) It throws a TypeError
Explanation: Spread makes a shallow copy, so a.info and b.info are the same nested object.

Q: Why should a to-do list use one click listener on the ul instead of one listener per delete button? (Select all that apply.)
*A) Items added later are handled without attaching new listeners
*B) Click events bubble from the button up to the ul, so one listener can see them all
C) Listeners on buttons never fire
*D) Re-rendering the list does not lose any listeners
Explanation: Event delegation relies on bubbling; event.target.closest() finds the button that was clicked.

Q: A form's submit handler adds a task, but the page reloads and the task disappears immediately. What is missing?
A) form.reset()
*B) event.preventDefault()
C) event.stopPropagation()
D) A click listener on the button
Explanation: A form submission navigates by default; preventDefault() stops the reload.

Q: A user types `<img src=x onerror=alert(1)>` as a task title. Which line displays it safely?
*A) span.textContent = title
B) span.innerHTML = title
C) list.innerHTML += `<li>${title}</li>`
D) document.write(title)
Explanation: textContent never parses HTML. innerHTML with user input allows cross-site scripting.

Q: You save with `localStorage.setItem("tasks", tasks)` where tasks is an array of objects. What do you get back from getItem after a reload?
A) The same array of objects
*B) The string "[object Object],[object Object]"
C) null
D) An error is thrown when saving
Explanation: localStorage stores strings only. Save with JSON.stringify and read with JSON.parse.

Q: In a Subsets solution, the code appends `result.append(path)` instead of `result.append(path[:])`. What happens?
A) It works but uses more memory
*B) Every stored answer is the same list object, which ends up empty after backtracking
C) It raises a RecursionError
D) Duplicate subsets appear
Explanation: The working list keeps changing; storing it without copying means all entries show its final state.

Q: In Generate Parentheses with n pairs, when is it valid to add a ")"?
A) Whenever close < n
*B) Only when close < open
C) Only when open == n
D) Only at the end of the string
Explanation: You can never close more brackets than you have opened so far.
