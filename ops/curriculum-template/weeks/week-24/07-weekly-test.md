---
type: quiz
title: "W24 · Weekly Test: Integration, Testing, Review and Set B Patterns"
slug: w24-weekly-test
topic: Week 24 Assessment
subject: dev-tools
quizType: formal
timeLimit: 25
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt test on front-end and back-end integration, unit and API testing, code review, bug triage and the set B tree, graph and heap patterns. 15 questions, 25 minutes.
---
Q: In the test pyramid, which kind of test should a project have the most of?
*A) Unit tests of individual functions and rules
B) Manual end-to-end tests through the UI
C) Load tests
D) Screenshot comparisons
Explanation: Unit tests are fast and cheap, so they form the wide base; slower end-to-end checks are fewer.

Q: The eligibility rule should accept CGPA 7.5 or more, but the code uses > instead of >=. Which test catches the bug?
A) A student with CGPA 8.1
B) A student with CGPA 7.4
*C) A student with CGPA exactly 7.5
D) A student with CGPA 10
Explanation: Only the boundary value behaves differently under > and >=.

Q: Why can Supertest call request(app).get('/api/health') without the server listening on a port?
A) Supertest starts a browser
*B) app.js exports the Express app without calling listen, and Supertest binds it to a temporary port itself
C) Supertest only reads the route definitions and never runs them
D) It cannot; the server must be started first
Explanation: Keeping app construction separate from listen lets tests use the app directly.

Q: Git reports a merge conflict in api.js. What is the correct way to finish?
A) Delete the file and commit
B) Run git push --force
*C) Edit the file to the correct combined code, remove the conflict markers, run the tests, then git add and git commit
D) Accept your own version in every conflicted file without reading
Explanation: Resolve deliberately, verify, then stage and commit to complete the merge.

Q: The React app on localhost:5173 calls the API on localhost:4000 and the browser console reports a CORS error. Where is this fixed?
A) In the React component's CSS
*B) On the API server, by allowing the front-end origin (for example with the cors middleware)
C) By disabling JavaScript in the browser
D) In the database connection string
Explanation: CORS permission is granted by the server's response headers for the allowed origin.

Q: Which elements make a bug report actionable? (Select all that apply.)
*A) Exact steps to reproduce
*B) Expected result and actual result
*C) Environment (URL, browser, account used)
D) A guess at which teammate caused it
Explanation: A developer must be able to reproduce the bug; blame does not help fix it.

Q: During the bug bash a tester opens the coordinator dashboard as a student by typing its URL, and the data loads. What severity is this?
*A) Critical
B) Major
C) Minor
D) Cosmetic
Explanation: It is a broken access control, a security hole, which is critical.

Q: Double-clicking Apply creates two applications. Which fix addresses the cause?
A) Disable the button after the first click, and nothing else
B) Show a warning message asking users not to double-click
*C) Add a UNIQUE constraint on (drive_id, student_id) and return 409 when it is violated
D) Delete duplicate rows every night
Explanation: The database rule stops duplicates from any client; disabling the button is only a nice extra.

Q: Which code review comment is the most helpful?
A) This is wrong.
B) Rewrite this.
*C) If branches is an empty list this returns every drive. Should an empty list mean no branch is allowed?
D) I would have done it differently.
Explanation: Helpful comments are specific, explain the problem and invite a decision.

Q: Which states should every data-loading screen handle? (Select all that apply.)
*A) Loading
*B) Error, with a readable message
*C) Empty, when there is no data yet
D) A hidden debug state that prints the token
Explanation: Loading, error and empty states prevent "the button does nothing" failures; tokens must never be displayed.

Q: In BFS over genes (Minimum Genetic Mutation), why mark a gene as seen when it is added to the queue rather than when it is removed?
A) It makes the answer larger
*B) It stops the same gene from being queued many times, keeping the search O(number of states)
C) Python's deque requires it
D) It is only a style preference with no effect
Explanation: Marking on enqueue prevents duplicate entries; marking on dequeue can add the same node repeatedly.

Q: A tree has root 1 with children 2 and 3; node 2 has children 4 and 5; node 3 has a right child 6. What is its zigzag level-order traversal?
A) [[1], [2, 3], [4, 5, 6]]
*B) [[1], [3, 2], [4, 5, 6]]
C) [[1], [3, 2], [6, 5, 4]]
D) [[1], [2, 3], [6, 5, 4]]
Explanation: Level 1 left to right, level 2 right to left, level 3 left to right again.

Q: Using preorder serialisation with # for missing children, how is the tree root 1 with left child 2 and right child 3 written?
A) 1,2,3
B) 2,1,3
*C) 1,2,#,#,3,#,#
D) 1,#,2,#,3
Explanation: Visit root, then the whole left subtree (2 and its two missing children), then the right subtree.

Q: What is the time complexity of finding the k largest of n numbers with a min-heap of size k?
A) O(n²)
B) O(k log n)
*C) O(n log k)
D) O(1)
Explanation: Each of the n numbers may cause one push or pop on a heap of size k, costing O(log k).

Q: Which of these problems are naturally solved with BFS for a shortest path in an unweighted graph? (Select all that apply.)
*A) Minimum Genetic Mutation
*B) Word Ladder
C) Serialize and Deserialize Binary Tree
D) Design Twitter
Explanation: Both mutation problems ask for the fewest one-step changes; the other two are traversal and heap-merge problems.
