---
type: resource
title: "W25 · Cheat Sheet: Hardening, Deployment, Documentation and HR Prep"
slug: w25-cheat-sheet
topic: Week 25 Reference
subject: dev-tools
minutes: 10
description: One-page reference for Capstone Sprint 3 — the security checklist, deployment steps and smoke test, logging rules, the README checklist, demo-video and slide outlines, HR answer structures and this week's deliverables.
---
# Week 25 cheat sheet

**Feature freeze mid-week.** New ideas go on the "future scope" slide.

## Security checklist

- [ ] No secrets in Git (`.env` ignored; leaked key = **revoke and replace**)
- [ ] Passwords hashed with bcrypt/Argon2; `password_hash` never returned by the API
- [ ] Parameterised queries (`WHERE id = $1`), never string-built SQL
- [ ] Every protected route checks authentication **and** role/ownership on the server
- [ ] Server-side validation on every write (Zod / Pydantic) → 400 with a clear message
- [ ] Central error handler: log details on the server, return a generic 500 message
- [ ] CORS limited to your front end; `helmet` headers; rate limit on login
- [ ] HTTPS only; no personal data sent to LLMs

## Quick wins

Paginate lists · index filtered columns · fix N+1 with a JOIN · cache slow reports · `@st.cache_resource` for models ·
labels on inputs · `alt` text · real `<button>`s · keyboard-only journey works · run Lighthouse.

## Deployment steps

1. Config from env vars; fail fast if one is missing
2. Separate production database → migrate → seed demo data
3. Deploy API → check `/api/health`
4. Deploy front end with `VITE_API_URL` (build-time: rebuild after changing)
5. Set `CLIENT_ORIGIN` for CORS; SPA rewrite to `index.html`
6. Smoke test: HTTPS, health, each role logs in, main journey, refresh inner page, phone

Broken production after a merge: `git revert -m 1 <merge-commit>` on main, redeploy, fix on a branch.

## Logs

Log method, path, status, duration and errors. **Never** log passwords, tokens, keys or personal data.

## README checklist

Title + one line · live URL + demo video + CI badge · problem · features · screenshots · stack + architecture ·
setup (prereqs, `.env.example`, install, migrate, seed, run) · demo accounts · folder structure · API reference ·
team contributions · future scope.

## Demo video (3 min)

Problem 0:20 → main journey 2:00 → architecture 0:25 → links and team 0:15. Script it; use the live app.

## Demo Day deck (15 min with demo)

Title · problem · solution · architecture · data design · **live demo (6 min)** · quality · challenges · future scope ·
thank you. Backup: recorded video, pre-logged-in demo accounts.

## HR answers

- **Tell me about yourself**: present → past (projects, your part) → future (why this role), 60–90 s.
- **STAR**: Situation · Task · **Action (most of it)** · Result + lesson.
- **Salary (campus)**: know the published package; accept it politely; never invent offers.
- **GD**: note 2–3 points; open or summarise; build on others; include quiet members; no shouting.

## This week

| Item | Details |
|---|---|
| **Deliverable** | CAP-M3 · Deploy & Docs Check: live deployment, complete README, updated architecture diagram, API docs and user guide, 3-minute demo video, slide deck, security checklist |
| **Practice quiz** | Capstone Sprint 3: Polish, Deploy & Document (untimed, retakes allowed) |
| **Weekly test** | 15 questions on hardening, deployment, documentation, HR preparation and set C patterns, 25 minutes |
| **DSA** | Set C: Multiply Strings, Game of Life, Valid Parenthesis String, Stock with Cooldown, Interleaving String, Minimum Interval to Include Each Query, Distinct Subsequences; 90-minute timed contest |
| **Career task** | HR mock interview ("tell me about yourself", common questions, salary etiquette); group discussion practice; company-specific preparation sheets |
