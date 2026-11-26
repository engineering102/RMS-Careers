---
type: notes
title: "W26 · S1 · Capstone Demo Day: Presentation, Live Demo, Q&A and Viva"
slug: w26-s1-capstone-demo-day
topic: Demo Day
subject: career
minutes: 30
description: How Demo Day runs, how the panel scores the capstone out of 100, a morning-of checklist, how to handle a failing demo, and how to prepare for the individual viva on your own code.
---
# Capstone Demo Day: presentation, live demo, Q&A and viva

Demo Day is the end of four weeks of team work and six months of learning. Each team presents to an **evaluation
panel**, usually including your tutor and at least one external evaluator such as an industry professional or alumnus.
This note tells you exactly how it runs and how to prepare.

## The format

| Part | Time | Who |
|---|---|---|
| Presentation + live demo | 15 minutes | Whole team; each member presents their own feature |
| Q&A | about 5–10 minutes | Panel asks the team, often naming a specific member |
| Individual viva | a few minutes each | Each member explains and, if asked, modifies their own code |

## How you are scored (CAP-M4 · Final Evaluation, 100 marks)

| Criterion | Marks | What good looks like |
|---|---|---|
| Functionality and completeness | 25 | All must-have features work in the **live** demo |
| Architecture and data design | 15 | Design matches implementation; sensible structure and schema |
| Code quality and Git practice | 15 | Readable code, consistent structure, meaningful commits, reviewed PRs |
| Testing and reliability | 10 | Tests present; invalid input and errors handled gracefully |
| Security and deployment | 10 | Live URL, no committed secrets, hashed passwords, validated input |
| Documentation | 10 | README, architecture diagram, API/user docs, demo video |
| Presentation and viva | 15 | Clear story; every member answers questions about their own code |

For the SAP case-study capstone, "Code quality and Git practice" becomes **process accuracy and configuration
rationale**, and "Security and deployment" becomes **integration and document-flow evidence**, with the same marks.

Notice that 25 marks depend on the demo **working live**, and 15 depend on each person answering for their own work.
Preparation for both is entirely in your control.

## The day before

- [ ] Code freeze: `main` is tagged (`git tag v1.0 && git push origin v1.0`) and deployed.
- [ ] Smoke test passes on the live URL; demo data re-seeded.
- [ ] Slides final and shared with the coordinator in the requested format (PDF is safest).
- [ ] Full rehearsal with a timer, including the hand-overs between members.
- [ ] Backup plan ready: recorded demo video downloaded locally, screenshots in the deck.
- [ ] Every member has re-read their own feature's code and the PRs they merged.

## The morning of Demo Day

- [ ] Open the live app 15 minutes early (some hosts pause idle services).
- [ ] Log in to each demo account in a **separate browser profile** or window, so no one types passwords on screen.
- [ ] Browser zoom at 125% or so for readability; notifications off; unrelated tabs closed.
- [ ] Laptop charged and charger with you; know how to connect to the projector.
- [ ] Mobile hotspot available as a network backup.

## Presenting well

**Tell a story, not a feature list.** Start with one person and their problem ("Meera, a coordinator, has 400 students
and 12 drives in four spreadsheets…"), then show how your product solves it, step by step.

**Hand over cleanly.** "Ravi will now show how eligibility is enforced." The next person starts immediately.

**Narrate the demo.** Say what you are about to do and what the panel should notice: "I'm logged in as a student with
CGPA 7.2. Notice the Data Analyst drive is not listed, because it needs 7.5."

**Show at least one unhappy path.** Try to apply twice and show the 409 message; try to open the coordinator page as a
student. Evaluators remember teams who demonstrate that their app handles errors.

## When the demo breaks

It happens to experienced engineers too. What matters is how you respond:

1. Stay calm and say what happened: "The host is not responding."
2. Try **one** quick fix (refresh, switch network). Do not debug in front of the panel for minutes.
3. Switch to the backup: play the recorded video for that part, then continue live when possible.
4. Afterwards, if asked, explain the likely cause and how you would prevent it.

## The Q&A

Typical questions and what they test:

| Question | Tests |
|---|---|
| "Why PostgreSQL rather than MongoDB?" | You made a reasoned choice, not a default |
| "Show me where the role check happens." | Security is on the server, and you know your code |
| "What happens if two coordinators edit the same drive at once?" | Thinking about concurrency; honest limits |
| "How did you test the eligibility logic?" | Testing practice |
| "What was the hardest part, and what would you do differently?" | Reflection and honesty |
| "Who wrote this function?" | Ownership; cross-checked with commit history |

Good answers are short and specific. "I don't know, but I would check X" is far better than guessing. If a question
is aimed at a teammate, let them answer.

## The individual viva

The viva checks that **you** understand **your** code. AI coding assistants were allowed during the capstone, but you
must be able to explain and modify any line you submitted. Expect requests like:

- "Open the file for your feature and walk me through what happens when this button is clicked."
- "What does this line do? What happens if this value is null?"
- "Change the eligibility rule to allow one backlog. Show me where."
- "Why is this query safe from SQL injection?"
- "What does this test check, and what would make it fail?"

Prepare by tracing your feature from the UI event to the database and back, and by making one small change yourself
in each file you own, so the code is fresh in your hands.

## After Demo Day

- Update the README with the final demo video and slides.
- Add the capstone to résumé v3 with real, verified outcomes (features shipped, tests written, deployed URL).
- Write a short LinkedIn post about the project and your role, with the live link.
- Thank the panel and your teammates. You will want them as references.

## Lab: panel evaluation

Present your capstone, demonstrate it live, answer the panel's questions and complete your individual viva. Submit
**CAP-M4 · Final Evaluation** with the final links.

## Check yourself

1. Functionality (25) and presentation and viva (15) together are 40 of the 100 marks. What does that tell you about
   where to focus your final preparation?
2. Your live demo fails halfway through. List the steps you take, in order.
3. Pick one function you wrote for the capstone. Explain it line by line to a friend, then explain what would break if
   its input were empty.
