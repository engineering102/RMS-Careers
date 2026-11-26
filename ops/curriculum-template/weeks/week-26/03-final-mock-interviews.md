---
type: notes
title: "W26 · S3 · Final Technical and HR Mock Interviews"
slug: w26-s3-final-mock-interviews
topic: Interview Preparation
subject: career
minutes: 35
description: How a full technical and HR interview flows, a project deep-dive framework, quick-fire fundamentals you should answer in one breath, online-interview etiquette, and turning interviewer feedback into a two-week action plan.
---
# Final technical and HR mock interviews

This is your last mock interview in the programme, combining a technical round and an HR round, followed by individual
feedback. The target on the mock interview rubric is an **average of 3.5 out of 5 or higher**. Treat it as a real
interview: dress, punctuality and preparation count.

## How a campus interview usually flows

| Stage | Typical length | What is assessed |
|---|---|---|
| Introduction ("tell me about yourself") | 2 minutes | Communication, clarity of goals |
| Project discussion | 10–15 minutes | Depth, ownership, design reasoning |
| Coding or problem solving | 15–20 minutes | Problem solving, coding, testing |
| Fundamentals | 5–10 minutes | OOP, DBMS, OS, networks, the language you listed |
| HR questions | 5–10 minutes | Motivation, attitude, team fit |
| Your questions | 2–3 minutes | Interest and preparation |

In many companies the technical and HR parts are separate rounds on the same day; the content is the same.

## The project deep-dive

Interviewers pick one project from your résumé (usually the capstone) and keep asking "why?" and "how?" until they find
the edge of your understanding. Prepare your capstone at four levels:

1. **What**: the problem and the main features (30 seconds).
2. **How**: architecture; what happens from a click to the database and back.
3. **Why**: the reasoning behind each major choice, and the alternatives you rejected.
4. **What if**: limits and improvements (scale, security, failures).

Questions to rehearse:

- What exactly did **you** build? Show me with one example.
- Why this database / framework / model?
- How is a password stored and checked in your app?
- What is the most complex query or function you wrote? Walk me through it.
- How did you test it? What bug took longest to find?
- What would break first with 100 times more users, and how would you fix it?
- If you started again, what would you change?

Say "we" for team decisions and "I" for your own work, and be precise about the difference. Interviewers are checking
ownership.

## Coding in the interview

Use the routine from Week 23: **clarify → examples → brute force → optimise → code aloud → test → complexity**. Two
extra habits for the final round:

- **Ask before you assume.** "Can the array be empty? Can values be negative? Should I return indices or values?"
- **Test with your own example out loud**, line by line, before saying "done". Finding your own bug scores better than
  the interviewer finding it.

If you get stuck, say what you are thinking: "I'm trying to avoid checking every pair; since the array is sorted, maybe
two pointers…". Interviewers often give hints to candidates who think aloud, and almost never to silent ones.

## Quick-fire fundamentals

You should be able to answer each of these correctly in one or two sentences:

| Question | Core of a good answer |
|---|---|
| Overloading vs overriding? | Overloading: same name, different parameters (compile time, where the language supports it). Overriding: a subclass redefines an inherited method (runtime polymorphism). |
| Abstract class vs interface? | An abstract class can hold state and partial implementation; an interface defines a contract a class promises to fulfil. |
| What is normalisation and why? | Organising tables to remove redundancy and update anomalies; 3NF removes transitive dependencies. |
| Explain ACID. | Atomicity, Consistency, Isolation, Durability: a transaction is all-or-nothing, keeps rules valid, is not disturbed by others, and survives crashes once committed. |
| `WHERE` vs `HAVING`? | `WHERE` filters rows before grouping; `HAVING` filters groups after `GROUP BY`. |
| Process vs thread? | A process has its own memory space; threads within a process share memory and are cheaper to switch. |
| What is a deadlock? | Processes wait for each other forever; needs mutual exclusion, hold and wait, no preemption and circular wait. |
| TCP vs UDP? | TCP is connection-oriented and reliable, with ordering and retransmission; UDP is connectionless and faster, without guarantees. |
| What happens when you type a URL? | DNS lookup → TCP connection → TLS handshake for HTTPS → HTTP request → server response → browser renders. |
| Hash map lookup cost? | O(1) on average; O(n) in the worst case with many collisions. |
| Stack vs queue? | Stack is last-in-first-out; queue is first-in-first-out. |

Do not memorise these as scripts; make sure you could explain each with an example from your own projects.

## The HR round, final version

Revisit your Week 25 preparation: "tell me about yourself" (present → past → future), your STAR story bank, and
salary-expectation etiquette. For the final mock:

- Update "tell me about yourself" with the **finished** capstone and your Demo Day experience.
- Have a true story ready for each: teamwork, conflict, failure, leadership, learning quickly, working under pressure.
- Know why you want the role and what you know about the (mock) company.
- Be honest about constraints such as relocation, and about gaps. Honesty plus a plan beats a polished invention.

### Questions to ask the interviewer

Always have two ready. Good ones:

- "What does a new graduate typically work on in the first few months?"
- "How does the team review code and share knowledge?"
- "What would make someone successful in this role in the first year?"

Avoid questions answered on the first page of the company website, and do not open with leave or salary.

## Online interview etiquette

- Test camera, microphone and internet 15 minutes before; close other apps.
- Quiet room, plain background, light in front of you rather than behind.
- Look at the camera when speaking; keep a notepad for rough work.
- If the connection drops, rejoin quickly and calmly summarise where you were.
- Keep your phone face down and silent.

## Turning feedback into a plan

After the mock, you receive a scored rubric and comments. Do not just file it. Make a **two-week action plan**:

| Lowest-scoring area | Action | Evidence of progress |
|---|---|---|
| Problem solving (2/5) | 2 medium problems a day from the LeetCode 150 sheet, timed, thinking aloud | Solve a new medium in 25 minutes |
| Technical fundamentals (3/5) | Revise one OS or DBMS topic a day with one-sentence answers | Peer quiz score |
| Communication (3/5) | Record yourself answering three questions; listen back | Shorter, structured answers |

Ask the interviewer one follow-up question about the feedback: "What is the one thing that would most improve my
score?"

## Lab: interview feedback report

1. Attend the final technical and HR mock interviews.
2. Collect your scored rubric and comments.
3. Write your two-week action plan in your progress tracker.
4. Update your STAR story bank and "tell me about yourself" based on the feedback.

## Check yourself

1. An interviewer asks, "What did you do in this project?" How do you separate team work from your own?
2. Explain the difference between a process and a thread with an example from a web server.
3. Your lowest rubric score is Communication. Name two concrete practice actions for the next two weeks.
