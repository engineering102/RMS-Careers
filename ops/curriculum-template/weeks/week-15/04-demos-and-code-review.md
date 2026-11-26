---
type: notes
title: "W15 · S4 · MP3 Demos, Code Review and the 2-Minute Demo Video"
slug: w15-s4-demos-and-code-review
topic: Mini Project 3
subject: web-development
minutes: 30
description: Preparing a live demo and viva for Mini Project 3, a practical code review checklist for full stack apps, giving and acting on review comments, recording a 2-minute demo video, finishing the README, and turning MP3 into resume bullets.
---
# MP3 demos, code review and the demo video

Today your team shows Mini Project 3, reviews another team's code, fixes what the reviews find and records a short demo
video. These are the same activities as a sprint review in a software company, and the demo and viva are 20% of the
MP3 rubric.

## The live demo (5 minutes)

Plan it like a story, not a tour of every screen.

| Minute | Show |
|---|---|
| 0:00–0:30 | The problem and who uses the app (one sentence each) |
| 0:30–2:30 | The main journey, live on the **deployed** URL: sign up or log in as role 1, do the core task; switch to role 2 and respond to it |
| 2:30–3:30 | One thing that proves quality: a server-side role check (403 in Thunder Client), the "apply once" 409, a waitlist, or the status history |
| 3:30–4:30 | Architecture in one diagram (client → API → database, where each is hosted) and the CI badge |
| 4:30–5:00 | What you would build next, and who built what |

Preparation checklist:

- [ ] Two demo accounts (one per role) already created with **fake** data; passwords ready, not typed from memory
- [ ] The free API instance **woken up** a few minutes before you present
- [ ] A backup: screenshots or the demo video, in case the network fails
- [ ] Browser zoom at about 125% so the room can read it; notifications off

## The viva: be ready to explain any line

Tutors will point at code and ask questions. Typical ones for MP3:

- Walk me through what happens, from click to database and back, when a student applies to a job.
- Where is the password hashed? Why bcrypt? What is in your JWT, and how long is it valid?
- Show me where a student is stopped from deleting a recruiter's job. What status code do they get?
- Why is this value in `useState` and that one in Context?
- What does your CI workflow do? What happens if a test fails?
- How does the front end know the API URL in production? Where are your secrets stored?
- What would break first if 1,000 students used this at once?

If you do not know an answer, say what you would check and where. Guessing is worse than an honest "I would verify that
in the pg documentation".

## Code review: what to look for

You will review another team's repository and they will review yours. Leave comments on a pull request or as GitHub
issues, one finding per comment.

| Area | Questions to ask |
|---|---|
| **Security** | Any secrets in the repo or its history? Passwords hashed? Every write route behind `requireAuth`? Role and ownership checks on the **server**? Parameterised SQL everywhere? |
| **Correctness** | Do edge cases work: empty lists, duplicate submissions, deleting something that is referenced, an expired token? |
| **Validation and errors** | Is every body and param validated? Are errors consistent JSON with the right status codes? Does the UI show them? |
| **States** | Loading, error and empty states on every fetching page? Buttons disabled while saving? |
| **Code quality** | Clear names? Routes → controllers → services respected? Components small? Dead code and `console.log`s removed? |
| **Git and CI** | Small, well-named commits? Work done through PRs? CI green and required? |
| **Docs** | Can a stranger run it from the README alone? Live URL, screenshots, video, `.env.example` present? |

### Writing useful review comments

Be specific, explain why, and suggest a fix. Label severity so authors know what to do first.

| Weak | Useful |
|---|---|
| "Security issue" | **[must fix]** `DELETE /api/v1/jobs/:id` checks the token but not the owner, so any recruiter can delete any job. Compare `job.recruiterId` with `req.user.id` in `jobs.service.js` and return 403. |
| "Bad naming" | **[suggestion]** `data2` in `JobList.jsx` holds filtered jobs; `visibleJobs` would make the filter logic easier to follow. |
| "Looks good" | **[praise]** The `UNIQUE (job_id, student_id)` constraint plus the 409 handler is a clean way to enforce "apply once". |

### Receiving review

Thank the reviewer, ask questions if a comment is unclear, and fix **must-fix** items first. Make each fix a small
commit that references the comment or issue (`Fix ownership check on job delete (#31)`). It is fine to disagree with
a suggestion; explain your reasoning in a reply rather than ignoring it.

## Recording the 2-minute demo video

The video lets reviewers and recruiters see the app without logging in. Two minutes is short, so script it.

1. **Script** (about 250 words): problem (15 s), main journey for role 1 (45 s), role 2 (30 s), one quality point
   (15 s), stack and links (15 s).
2. **Record** the deployed site with a screen recorder such as OBS Studio or the one built into your operating
   system. Use a quiet room and a headset microphone if you have one.
3. **Prepare data** so screens are not empty; never show real personal data or real passwords.
4. **Upload** as an unlisted YouTube video or a file in Google Drive with link sharing, and test the link in a private
   browser window.

Keep it to one take with light trimming; clear narration matters more than editing.

## Finish the README (documentation checklist)

The documentation criterion (15% of MP3) follows the programme's project documentation checklist:

- [ ] Project title, one-line description and CI badge
- [ ] Problem statement and key features (per role)
- [ ] Technology stack and an architecture diagram
- [ ] Setup: prerequisites, install, environment variables via `.env.example`, migrate, seed, run
- [ ] Screenshots or a GIF, the **live URL** and the **demo video link**
- [ ] Folder structure and API reference (from `docs/api.md`)
- [ ] Team members and what each contributed (with PR links); future scope

Pin the repository on every team member's GitHub profile.

## Career task: resume v1

This week you also produce **Resume v1**: one page, single column, ATS-friendly, exported as a PDF named like
`Firstname_Lastname_Resume.pdf`. MP3 is likely your strongest project entry so far. Each project bullet follows
**action verb + what you built + technology + a true, measurable result**:

- *Built a job board with recruiter and student roles using React, Express and PostgreSQL, deployed on Vercel and
  Render, with role checks enforced on 9 API endpoints.*
- *Set up GitHub Actions CI running ESLint and 14 Vitest tests on every pull request, keeping main deployable.*

Use your own real numbers (endpoints, tests, screens), never invented users or percentages. Put the live URL and
repository link next to the project title.

## Lab: fix review findings and record the demo

1. Present your 5-minute demo and answer viva questions.
2. Review the repository assigned to you; file at least five specific findings with severity labels.
3. Fix every must-fix finding on your own repository through PRs; reply to every comment.
4. Record and upload the 2-minute demo video; add the link to the README.
5. Complete the README checklist, confirm the live URL and CI badge, and submit MP3.
6. Draft Resume v1 with MP3 and at least one earlier mini project.

## Check yourself

1. Rewrite this review comment so it is useful: "auth is wrong".
2. During the demo the first API request takes a long time and the room waits. What happened, and how do you avoid it
   next time?
3. Write one resume bullet for your MP3 contribution using the action + what + technology + result pattern.
