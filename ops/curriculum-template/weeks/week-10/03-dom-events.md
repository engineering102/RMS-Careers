---
type: notes
title: "W10 · S3 · The DOM: Elements, Events, Validation and localStorage"
slug: w10-s3-dom-events
topic: DOM & Events
subject: web-development
minutes: 35
description: Make pages interactive — select and create elements, handle events, use event delegation, validate forms with inline messages, and keep data across reloads with localStorage.
---
# The DOM: elements, events, validation and localStorage

When the browser parses your HTML it builds the **DOM** (Document Object Model): a tree of objects, one per element.
JavaScript changes the page by changing this tree, and the browser redraws whatever changed.

```text
document
└── html
    ├── head
    └── body
        ├── h1
        └── ul#tasks
            ├── li
            └── li
```

## Selecting elements

```js
const title = document.querySelector("h1");            // first match, or null
const list = document.querySelector("#tasks");         // any CSS selector works
const items = document.querySelectorAll("#tasks li");  // all matches (a NodeList)

items.forEach((li) => console.log(li.textContent));
const texts = [...items].map((li) => li.textContent);   // spread into a real array for map/filter
```

`querySelector` returns `null` if nothing matches. If you see "Cannot read properties of null", check the selector
and make sure the script runs after the HTML exists (`defer` on the script tag).

## Reading and changing elements

```js
title.textContent = "My tasks";              // set text (safe: never parsed as HTML)
title.classList.add("highlight");            // add / remove / toggle / contains
title.classList.toggle("done");
title.style.color = "teal";                  // inline style; prefer toggling classes
const input = document.querySelector("#task-input");
console.log(input.value);                    // current text in an input
input.setAttribute("aria-invalid", "true");
title.dataset.count = "3";                   // sets data-count="3"
```

Prefer `classList` over `style`: keep the look in CSS and let JavaScript switch states.

### textContent vs innerHTML

`innerHTML` parses a string as HTML. If that string contains **user input**, a user can inject a `<script>` or an
`<img onerror=...>` and run code on your page (a cross-site scripting, or XSS, attack). Rule: **use `textContent`
for anything a user typed.** Use `innerHTML` only with strings you fully control.

## Creating and removing elements

```js
function renderTask(task) {
  const li = document.createElement("li");
  li.dataset.id = task.id;
  li.className = task.done ? "task done" : "task";

  const text = document.createElement("span");
  text.textContent = task.title;              // user text → textContent

  const del = document.createElement("button");
  del.type = "button";
  del.textContent = "Delete";
  del.dataset.action = "delete";

  li.append(text, del);
  return li;
}

list.append(renderTask({ id: 1, title: "Revise SQL joins", done: false }));
list.querySelector("li")?.remove();          // remove an element
list.replaceChildren();                       // remove all children
```

A simple, reliable approach for small apps: keep your data in an **array**, and write one `render()` function that
clears the list and rebuilds it from the array. Change the array, call `render()`. React (Week 12) is built on the
same idea.

## Events

```js
const button = document.querySelector("#add");
button.addEventListener("click", (event) => {
  console.log("clicked", event.target);
});
```

Events you will use most:

| Event | Fires when |
|---|---|
| `click` | an element is clicked (or a button is activated with Enter/Space) |
| `input` | the value of an input changes, on every keystroke |
| `change` | a select, checkbox or input is committed (on blur for text) |
| `submit` | a form is submitted (by a submit button or Enter) |
| `keydown` | a key is pressed |
| `DOMContentLoaded` | the HTML has been parsed |

### Forms: always handle submit

```js
const form = document.querySelector("#task-form");
form.addEventListener("submit", (event) => {
  event.preventDefault();                     // stop the page reload
  const title = form.elements.title.value.trim();
  if (!title) return;
  // ...add the task
  form.reset();
});
```

Listening for `submit` on the form (not `click` on the button) means pressing Enter works too.

## Event delegation

Events **bubble**: a click on a button also fires on its `li`, the `ul`, `body` and `document`. So instead of
attaching a listener to every delete button (and re-attaching whenever the list re-renders), attach **one** listener to
the container and check what was clicked:

```js
list.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;                         // the click was not on an action button
  const id = Number(button.closest("li").dataset.id);
  if (button.dataset.action === "delete") {
    tasks = tasks.filter((t) => t.id !== id);
    save();
    render();
  }
});
```

- `event.target` is the element actually clicked (it might be a `span` inside the button).
- `closest(selector)` walks up from there to the nearest matching ancestor (or the element itself).
- New items work automatically: no listener needs to be added when you create them.

Delegation is required in WB-10, and "how would you handle clicks on 1,000 list items?" is a common interview
question.

## Form validation with inline messages

The browser's built-in checks (`required`, `type="email"`, `minlength`) are a good start. For clear messages next to
each field, validate in JavaScript and write errors into the page, never with `alert()`:

```html
<form id="signup" novalidate>
  <label for="email">Email</label>
  <input id="email" name="email" type="email" required aria-describedby="email-error">
  <p id="email-error" class="error" aria-live="polite"></p>
  <button type="submit">Sign up</button>
</form>
```

```js
const signup = document.querySelector("#signup");

function showError(input, message) {
  const error = document.getElementById(input.getAttribute("aria-describedby"));
  error.textContent = message;
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

function validateEmail(input) {
  const value = input.value.trim();
  if (!value) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email, like name@college.edu.";
  return "";
}

signup.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = signup.elements.email;
  const message = validateEmail(email);
  showError(email, message);
  if (message) {
    email.focus();
    return;
  }
  console.log("valid:", email.value);
});

signup.elements.email.addEventListener("input", (event) => {
  if (event.target.getAttribute("aria-invalid") === "true") {
    showError(event.target, validateEmail(event.target));   // clear the error as soon as it is fixed
  }
});
```

- `novalidate` turns off the browser's pop-up bubbles so your own messages show instead.
- `aria-describedby` links the error to the input, and `aria-live="polite"` makes screen readers announce it.
- Client-side validation is for the user's convenience. The server must validate again.

## localStorage

`localStorage` keeps key–value **strings** in the browser for your site, and they survive reloads and restarts.

```js
const KEY = "rms-todo-tasks";

function save() {
  localStorage.setItem(KEY, JSON.stringify(tasks));
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    return [];                       // corrupted data: start fresh instead of crashing
  }
}

let tasks = load();
```

- Only strings are stored: `JSON.stringify` on save, `JSON.parse` on load.
- `getItem` returns `null` for a missing key; `JSON.parse(null)` is `null`, so `?? []` gives an empty list.
- It is per browser and per site, readable by any script on the page, and limited in size (a few MB). **Never store
  passwords or tokens you would not want stolen.**
- DevTools → **Application** → **Local storage** shows and edits the stored values.

## Lab: interactive form validator

Build `week-10/validator/` with a sign-up form: name, email, phone (10 digits), password (8+ characters with a
number) and confirm password.

- [ ] Each field shows an inline error below it on submit, and the error clears as soon as the field becomes valid.
- [ ] The first invalid field receives focus.
- [ ] A live password strength line updates on every `input` event.
- [ ] On success, show a "Registered" message in the page and save the name and email (never the password) in
      localStorage; on reload, show a greeting such as "Welcome back, Asha".
- [ ] No `alert()`, no `innerHTML` with user input.

## Check yourself

1. Why is listening for `submit` on a form better than listening for `click` on its button?
2. With event delegation, why do you use `event.target.closest("button")` instead of just `event.target`?
3. Your app saves `tasks` with `localStorage.setItem("tasks", tasks)`. After reload, what do you get back, and what
   is the fix?
