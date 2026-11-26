---
type: quiz
title: "W25 · Weekly Test: Hardening, Deployment, Documentation and Set C Patterns"
slug: w25-weekly-test
topic: Week 25 Assessment
subject: dev-tools
quizType: formal
timeLimit: 25
passPercent: 60
explanations: after_deadline
description: Timed, single-attempt test on validation and security, deployment and logging, documentation, HR answer structures and the set C greedy and DP patterns. 15 questions, 25 minutes.
---
Q: Why must input be validated on the server even if the React form already validates it?
A) Server validation makes the page load faster
*B) Anyone can send requests directly to the API without using your form
C) React validation does not work in production builds
D) It is not necessary when the form validates
Explanation: Client-side checks are for convenience; only the server can enforce rules for every request.

Q: A teammate committed an API key last week and removed it in a later commit. What must happen?
A) Nothing; the latest commit no longer contains it
B) Make the repository private and continue using the key
*C) Revoke the key with the provider, create a new one and store it only in environment variables
D) Rename the variable that held the key
Explanation: The key is still in Git history and may already be copied, so it must be revoked and replaced.

Q: Which practices prevent SQL injection? (Select all that apply.)
*A) Parameterised queries such as WHERE company_id = $1 with the value passed separately
*B) Using an ORM or query builder that parameterises values
C) Building SQL strings by joining them with user input
D) Validating input only in the React form
Explanation: Parameterisation keeps user data separate from SQL code; client checks can be bypassed.

Q: An unexpected database error occurs while creating a drive. What should the API send to the client?
A) The full stack trace so users can report it
B) The SQL query and the database error message
*C) A generic 500 message, while the full error is logged on the server
D) A 200 response so the UI does not show an error
Explanation: Details help attackers and confuse users; log them server-side and return a safe message.

Q: You changed VITE_API_URL in the front-end host's settings, but the live site still calls the old API. Why?
A) The browser does not support environment variables
*B) Vite inlines VITE_ variables at build time, so the front end must be rebuilt and redeployed
C) The API is blocking the new URL with CORS
D) Environment variables only work on localhost
Explanation: Static front-end builds bake these values in when they are built.

Q: Refreshing https://yourapp.example/drives/3 on the deployed React app gives a 404, but navigating there from the home page works. What is the usual fix?
A) Add a route for /drives/3 in Express
*B) Configure the host to serve index.html for unknown paths (a single-page-app rewrite)
C) Remove React Router
D) Disable HTTPS
Explanation: The client-side router handles the path only after index.html loads; the host must return it for every route.

Q: Which of these must never appear in your server logs? (Select all that apply.)
*A) User passwords
*B) JWT or session tokens
*C) API keys
D) Request method, path and status code
Explanation: Secrets in logs can be read by anyone with log access; request summaries are what logs are for.

Q: A page that lists 50 drives runs one query for the drives and then one extra query per drive to fetch its company. What is this called, and what fixes it?
A) A deadlock; fixed with a transaction
*B) The N+1 query problem; fixed by fetching companies with one JOIN or one batched query
C) SQL injection; fixed with parameters
D) A race condition; fixed with a mutex
Explanation: 1 + N round trips grow with the data; one JOIN or WHERE id = ANY($1) does it in a single query.

Q: Which change improves keyboard accessibility?
A) Replacing buttons with clickable div elements
*B) Using real button elements so they can be focused and activated with Enter or Space
C) Removing the focus outline for a cleaner look
D) Using placeholder text instead of labels
Explanation: Native buttons are focusable and keyboard-operable; the other changes make things worse.

Q: What should a recruiter see in the first three lines of a capstone README?
A) The licence text
B) The folder structure
*C) Project name, a one-line description, and links to the live app and demo video
D) The full list of npm dependencies
Explanation: Reviewers decide quickly; the name, purpose and live links come first.

Q: In a 3-minute demo video, where should most of the time go?
A) Introducing each team member in detail
B) Explaining the code line by line
*C) Showing the main user journey in the live app
D) Listing future features
Explanation: The video exists to prove the product works; the main journey takes about two of the three minutes.

Q: In a STAR answer to "Tell me about a time you resolved a conflict", which part should take the most time?
A) Situation
B) Task
*C) Action
D) Result
Explanation: Interviewers assess what you personally did, so Action carries most of the answer.

Q: In Stock with Cooldown, why can hold be reached from rest but not from sold on the same transition?
A) Because selling is not allowed after buying
*B) Because after selling you must wait a day, so buying is only allowed after a rest day
C) Because rest always has a higher value
D) Because hold must start at zero
Explanation: The cooldown rule forbids buying the day after a sale, so a purchase must come from the rest state.

Q: What does max_profit([1, 2, 3, 0, 2]) return for Stock with Cooldown?
A) 2
*B) 3
C) 4
D) 1
Explanation: Buy at 1, sell at 2, cool down at 3, buy at 0, sell at 2: profit 1 + 2 = 3.

Q: Which strings are valid in Valid Parenthesis String, where * can be (, ) or empty? (Select all that apply.)
*A) (*)
*B) (*))
C) )(
D) ((*
Explanation: (*) and (*)) can be balanced by choosing the star; )( starts with a close, and ((* leaves at least one open.
