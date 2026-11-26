---
type: notes
title: "W10 · S4 · Build: To-do or Quiz App with localStorage"
slug: w10-s4-todo-quiz-build
topic: Vanilla JS App Build
subject: web-development
minutes: 35
description: Plan and build a complete plain-JavaScript app — state in an array, one render function, event delegation, inline validation and localStorage persistence — then pair-review it and deploy it to GitHub Pages.
---
# Build: to-do or quiz app with localStorage

Today you build Weekly Build WB-10: **one** interactive app in plain JavaScript, either a to-do app or a quiz app. You
work in pairs for the session (one person types, one reviews, swap every 20 minutes), but each of you submits your own
repository.

## The architecture: state → render

Small apps fall apart when the data lives in the DOM ("is this checkbox ticked?"). Keep **one source of truth** in
JavaScript, and make the page a picture of it:

```text
  user action ──► update state (array/object) ──► save() to localStorage
                                    │
                                    └──────────► render() rebuilds the page from state
```

Every event handler follows the same three steps: **change the state, save, render**. Never edit the DOM directly
in a handler. This is exactly how React works, so the habit pays off in Week 12.

## Option A: the to-do app

### Requirements (from WB-10)

- Add, edit, complete and delete tasks.
- Filter: all / active / done.
- A count of remaining items and a "Clear completed" button.
- Tasks saved in localStorage and restored on reload.
- One click listener on the list (event delegation), inline validation (no `alert()`).

### HTML

```html
<main class="app">
  <h1>Tasks</h1>
  <form id="task-form" novalidate>
    <label for="title">New task</label>
    <input id="title" name="title" maxlength="80" aria-describedby="title-error">
    <p id="title-error" class="error" aria-live="polite"></p>
    <button type="submit">Add</button>
  </form>

  <div class="filters" role="group" aria-label="Filter tasks">
    <button type="button" data-filter="all" aria-pressed="true">All</button>
    <button type="button" data-filter="active" aria-pressed="false">Active</button>
    <button type="button" data-filter="done" aria-pressed="false">Done</button>
  </div>

  <ul id="task-list"></ul>

  <footer class="summary">
    <span id="remaining"></span>
    <button type="button" id="clear-done">Clear completed</button>
  </footer>
</main>
<script src="app.js" defer></script>
```

### JavaScript

```js
const KEY = "rms-wb10-tasks";
const form = document.querySelector("#task-form");
const list = document.querySelector("#task-list");
const remaining = document.querySelector("#remaining");
const errorEl = document.querySelector("#title-error");

let tasks = load();
let filter = "all";

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(tasks));
}

function visibleTasks() {
  if (filter === "active") return tasks.filter((t) => !t.done);
  if (filter === "done") return tasks.filter((t) => t.done);
  return tasks;
}

function render() {
  list.replaceChildren(
    ...visibleTasks().map(({ id, title, done }) => {
      const li = document.createElement("li");
      li.dataset.id = id;
      li.className = done ? "task done" : "task";

      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = done;
      box.dataset.action = "toggle";
      box.setAttribute("aria-label", `Mark "${title}" as done`);

      const text = document.createElement("span");
      text.textContent = title;

      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "Edit";
      edit.dataset.action = "edit";

      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "Delete";
      del.dataset.action = "delete";

      li.append(box, text, edit, del);
      return li;
    }),
  );

  const left = tasks.reduce((count, t) => (t.done ? count : count + 1), 0);
  remaining.textContent = `${left} ${left === 1 ? "item" : "items"} left`;

  document.querySelectorAll("[data-filter]").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.filter === filter));
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = form.elements.title.value.trim();
  if (!title) {
    errorEl.textContent = "Type a task before adding it.";
    form.elements.title.focus();
    return;
  }
  errorEl.textContent = "";
  tasks = [...tasks, { id: Date.now(), title, done: false }];
  save();
  render();
  form.reset();
});

list.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const id = Number(target.closest("li").dataset.id);
  const { action } = target.dataset;

  if (action === "toggle") {
    tasks = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
  } else if (action === "delete") {
    tasks = tasks.filter((t) => t.id !== id);
  } else if (action === "edit") {
    const current = tasks.find((t) => t.id === id);
    const next = prompt("Edit task", current.title)?.trim();
    if (!next) return;
    tasks = tasks.map((t) => (t.id === id ? { ...t, title: next } : t));
  }
  save();
  render();
});

document.querySelector(".filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  filter = button.dataset.filter;
  render();
});

document.querySelector("#clear-done").addEventListener("click", () => {
  tasks = tasks.filter((t) => !t.done);
  save();
  render();
});

render();
```

Notice: the handlers never touch list items directly. They replace `tasks` with a new array using `map` and
`filter`, then save and render. `prompt()` keeps the edit example short; for a better score, replace it with an
inline text input that appears in place of the title.

## Option B: the quiz app

### Requirements (from WB-10)

- 10 or more questions stored in a JSON array, shown **one at a time**.
- A score at the end and a per-question review (your answer vs the correct one).
- The best score saved in localStorage.

### Data and state

```js
const questions = [
  { text: "Which keyword declares a block-scoped constant?", options: ["var", "let", "const"], answer: 2 },
  { text: "What does [10, 9, 1].sort() return?", options: ["[1, 9, 10]", "[1, 10, 9]", "[10, 9, 1]"], answer: 1 },
  // ...at least 10
];

const state = { index: 0, picks: [] };   // picks[i] = the option index chosen for question i
const BEST_KEY = "rms-wb10-best";
```

### The core functions

```js
function score() {
  return state.picks.reduce((sum, pick, i) => (pick === questions[i].answer ? sum + 1 : sum), 0);
}

function finish() {
  const final = score();
  const best = Number(localStorage.getItem(BEST_KEY) ?? 0);
  if (final > best) localStorage.setItem(BEST_KEY, String(final));
  renderResults(final, Math.max(final, best));
}

optionsEl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-option]");
  if (!button) return;
  state.picks[state.index] = Number(button.dataset.option);
  state.index += 1;
  if (state.index === questions.length) finish();
  else renderQuestion();
});
```

`renderQuestion()` shows `questions[state.index]` with "Question 3 of 10" and one button per option
(`data-option="0"`, `"1"`…). `renderResults()` uses `map` over `questions` to list each question with the student's
choice and the correct answer. Add a "Play again" button that resets `state`.

Questions are data, so keep them in their own file, `questions.js`, and load it with a second `<script defer>` before
`app.js`. Scripts with `defer` run in order.

## Pair-build workflow

1. **Plan (15 min)**: list the state, the events, and what `render()` must show. Write it in the README.
2. **Build in small commits**: "Add task form with validation", "Render tasks from state", "Persist to
   localStorage". Each commit should leave the app working.
3. **Swap roles** every 20 minutes. The reviewer reads every line and asks "why?"; if the typist cannot answer, fix
   it before moving on.
4. **Test the edge cases**: empty input, only spaces, a very long title, reload in the middle, clearing localStorage
   in DevTools → Application, keyboard only (Tab, Space, Enter).

## Deploy and link

Push to GitHub, then **Settings → Pages → Deploy from a branch → main / (root)**, as in Week 9. Then:

- [ ] Add a project card for the app to your **portfolio** (this week's career task) with a two-line description,
      the live link and the repository link.
- [ ] README: what the app does, which option you built, a screenshot, the live URL, and one paragraph on how state,
      render and localStorage fit together.

## WB-10 checklist

- [ ] Data in localStorage, restored on reload.
- [ ] Uses `map`, `filter` and `reduce`, destructuring and template literals.
- [ ] One delegated click listener on the list or options container.
- [ ] Inline validation messages; no `alert()`.
- [ ] Deployed on GitHub Pages and linked from the portfolio.
- [ ] Stretch: fully keyboard-usable; a dark mode toggle remembered in localStorage.

## Check yourself

1. Why does every handler end with `save()` and `render()` instead of editing the list item that was clicked?
2. Why is `tasks = tasks.filter(...)` safer than deleting items from the array inside a `forEach`?
3. Your quiz's best score shows as `"7"` and `"10" > "7"` is false. What went wrong, and how do you fix it?
