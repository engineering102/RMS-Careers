---
type: notes
title: "W11 · S4 · Team Build: API Explorer with Feature Branches and PR Reviews"
slug: w11-s4-api-explorer-team-build
topic: Team API App Build
subject: web-development
minutes: 35
description: Build a GitHub Profile Finder or Weather app in a team of three with Vite, a debounced search and proper async states, using feature branches and reviewed pull requests, and finish your LinkedIn profile.
---
# Team build: API explorer with feature branches and PR reviews

This week's build, WB-11, is a **team** project: three people, one repository, one deployed app. The technical goal is
a well-behaved API consumer. The equally important goal is working the way software teams work: **nobody pushes to
`main`; every change arrives through a reviewed pull request.**

## Choose your app

| GitHub Profile Finder | Weather app |
|---|---|
| Search a username; show a profile card | Search a city; show current conditions |
| Latest 5 repositories sorted by stars | 5-day forecast |
| Language summary across repositories | °C / °F unit toggle |
| API: GitHub REST API, no key needed | API: a weather API with a free key, or one that needs no key |

Pick one and read its API documentation together before you write any code. Find: the base URL, the exact endpoint
for each feature, an example JSON response, and the rate limits.

## Requirements (WB-11)

1. Vite project with ESLint and Prettier configured; `npm run lint` passes.
2. `fetch` with `async`/`await`; separate **loading**, **error** (including "not found" and network failure) and
   **empty** states.
3. Search input **debounced** (around 400 ms) so typing does not fire a request per key.
4. Code split into ES modules: `api.js`, `ui.js`, `main.js` at minimum.
5. Each member builds one feature on a branch and merges it through a **reviewed PR**; no direct commits to `main`
   after the first setup commit.
6. Deployed (GitHub Pages, Netlify or Vercel).

## Suggested module layout

```text
api-explorer/
├── index.html
├── src/
│   ├── main.js        wiring: events, state, calls api + ui
│   ├── api.js         fetch helpers, ApiError (from S2)
│   ├── ui.js          render functions: renderLoading, renderError, renderEmpty, renderProfile
│   ├── debounce.js    the closure from S1
│   └── style.css
├── .env.example       only if your API needs a key
├── eslint.config.js
├── .prettierrc
└── README.md
```

The rule that keeps this clean: **`api.js` never touches the DOM, and `ui.js` never calls `fetch`.** `main.js` connects
them. Each file can then be built by a different person with few merge conflicts.

## Wiring the debounced search

```js
// src/main.js
import { getUser, getRepos, ApiError } from "./api.js";
import { renderLoading, renderError, renderEmpty, renderProfile } from "./ui.js";
import { debounce } from "./debounce.js";

const input = document.querySelector("#search");
let controller;

async function runSearch(rawName) {
  const name = rawName.trim();
  if (!name) return renderEmpty("Type a GitHub username to start.");

  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  renderLoading();
  try {
    const [user, repos] = await Promise.all([getUser(name, { signal }), getRepos(name, { signal })]);
    const topRepos = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 5);
    renderProfile(user, topRepos);
  } catch (err) {
    if (err.name === "AbortError") return;
    if (err instanceof ApiError && err.status === 404) return renderError(`No user called "${name}".`);
    renderError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
  }
}

input.addEventListener("input", debounce((event) => runSearch(event.target.value), 400));
```

Everything here comes from earlier sessions: closures (debounce), `async`/`await`, `Promise.all`, `AbortController`,
`sort` on a copy, and destructuring. In `ui.js`, build elements with `textContent`: names and bios come from other
people and must never go through `innerHTML`.

## The team workflow

### 1. Setup (one person, once)

```bash
npm create vite@latest api-explorer -- --template vanilla
cd api-explorer
npm install
npm install -D eslint @eslint/js globals prettier
# add eslint.config.js, .prettierrc, scripts, empty module files
git init
git add .
git commit -m "Set up Vite project with ESLint and Prettier"
git branch -M main
git remote add origin https://github.com/<team>/api-explorer.git
git push -u origin main
```

Then on GitHub: add teammates as collaborators, and protect `main` (**Settings → Branches → add a branch protection
rule** or a ruleset for `main`, requiring a pull request with one approval before merging). From now on, nobody can
push straight to `main`. Branch protection is available on public repositories with a free account; if your
repository is private and the option is unavailable, make it public or agree as a team to follow the rule by hand.

### 2. Split the work into features

Example for the GitHub finder:

| Member | Feature branch | Owns |
|---|---|---|
| 1 | `feature/search-and-states` | input, debounce, loading/error/empty states |
| 2 | `feature/profile-card` | `renderProfile`, avatar, stats, styling |
| 3 | `feature/repo-list` | top 5 repos by stars and the language summary |

### 3. Feature branch cycle

```bash
git switch main
git pull                                   # start from the latest main
git switch -c feature/profile-card
# ...work, small commits...
git add src/ui.js src/style.css
git commit -m "Render profile card with avatar and stats"
git push -u origin feature/profile-card
```

Open a pull request on GitHub from your branch into `main`. A good PR description says:

- **What** changed (two or three bullet points).
- **How to test** it ("search for `octocat`, then for `no-such-user-xyz`").
- A **screenshot** for anything visual.

### 4. Reviewing a pull request

The reviewer pulls the branch, runs it, and reads every changed line. Useful review comments are specific and kind:

| Weak comment | Useful comment |
|---|---|
| "This is wrong." | "If `user.bio` is null this prints `null`; could we show nothing instead?" |
| "Fix the style." | "`npm run lint` reports an unused import on line 3." |
| "LGTM" on a 300-line PR you did not run | Run it, then approve with what you tested: "Tested 404 and offline: both show messages." |

The author replies to each comment, pushes fixes to the same branch (the PR updates automatically), and merges only
after approval. Delete the branch after merging.

### 5. Merge conflicts

If two branches changed the same lines, GitHub reports a conflict. Fix it locally:

```bash
git switch feature/repo-list
git pull origin main          # bring main's changes into your branch
# open the conflicted files, keep the right lines, delete the <<<<<<< ======= >>>>>>> markers
npm run dev                   # check it still works
git add .
git commit -m "Merge main into feature/repo-list"
git push
```

Small, frequent PRs make conflicts rare and small.

## Deploy

Build and deploy once all three features are merged (see S3: Netlify/Vercel with output `dist`, or GitHub Pages with
`base` set and a GitHub Actions workflow). Put the live URL in the README and in the repository's About box.

## Career task: LinkedIn profile

Complete your LinkedIn profile using the programme's LinkedIn checklist:

- [ ] Professional photo and a banner.
- [ ] **Headline**: target role plus key skills (for example "Aspiring Full Stack Developer · JavaScript · Python ·
      SQL"), not just "Student at …".
- [ ] **About**: 3–5 lines on what you build, what you are learning, and what roles you are looking for.
- [ ] **Skills** that match your résumé.
- [ ] **Featured** section linking your portfolio site, plus project entries for your mini projects with live links.

Paste your LinkedIn profile URL into your tracker and into the WB-11 submission notes.

## Submission checklist

- [ ] Team repository with protected `main`; every feature merged through a reviewed PR.
- [ ] `npm run lint` passes; Prettier config committed.
- [ ] Loading, error (404 and offline), empty and success states all work; search is debounced.
- [ ] Deployed; README with features, screenshots, setup steps, live URL, and each member's contribution.
- [ ] In your submission notes: your feature, the link to your PR, and your LinkedIn URL.

## Check yourself

1. Why does the team protect `main` instead of trusting everyone to use branches?
2. Your PR has a merge conflict with `main`. What are the steps to resolve it?
3. Why does `api.js` never touch the DOM? What does that make easier?
